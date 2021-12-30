const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require('@octokit/action');

const run = async () => {
  try {
    const packageName = core.getInput('package_name');
    const context     = github.context;
    const token       = core.getInput('token');
    var octokit;

    if (token == '') {
      octokit = new Octokit();
    } else {
      const { Octokit } = require("@octokit/core");
      octokit = new Octokit({
        auth: token,
      });
    }

    octokit.hook.error("request", async (error, options) => {
      console.error("Request error. Options:")
      console.error(JSON.stringify(options))
      throw error;
    });

    // Get the current org or user. This will come from either org or user, or
    // we will try to guess it
    if (core.getInput('org')) {
      type = "org";
      org_user = core.getInput('org');
    } else if (core.getInput('user')) {
      type = "user";
      org_user = core.getInput('user');
    } else {
      org_user = context.payload.repository.full_name.split('/')[0];
      // We need to hit a different API depending on whether it's a user or not
      if (context.payload.repository.owner.type == "User") {
        type = "user";
      } else {
        type = "org";
      }
      console.log(`Detected org/user type: ${type}`)
    }

    console.log(`Checking if package ${packageName} exists in ${type} ${org_user}`);

    pkg = await octokit.request('GET /{type}s/{name}/packages/{package_type}/{package_name}', {
      package_type: 'container',
      package_name: packageName,
      name: org_user,
      type: type
    })

    console.log(`Found package id: ${pkg.data.id}`)

    // Note that the API will paginate responses so we need to make sure to
    // traverse all pages
    var current_page = 1;
    var last_page    = 1;
    var versions     = [];

    do {
      console.log(`Getting package versions page ${current_page}`);

      versionsResponse = await octokit.request('GET /{type}s/{name}/packages/{package_type}/{package_name}/versions', {
        package_type: 'container',
        package_name: packageName,
        name: org_user,
        type: type,
        page: current_page,
        per_page: 100
      });
  
      if (typeof versionsResponse.headers.link == 'string') {
        // Parse out the page info and update current page to next page 
        match = versionsResponse.headers.link.match(/\?page=(\d+).*\?page=(\d+)/);
        current_page = match[1]; // set to next
        last_page = match[2];    // set to last
      }
  
      // Add the versions to our list
      versions = versions.concat(versionsResponse.data);
    } while (current_page != last_page);

    // Filter to only untagged containers
    var untagged_versions = versions.filter(version => version.metadata.container.tags.length == 0)

    console.log(`Found ${untagged_versions.length} versions that were untagged`);

    deletion_promises = []

    for (const version of untagged_versions) {
      console.log(`Deleting untagged version: ${version.name}`)

      if (type == "user") {
        deletion_promises.push(octokit.request('DELETE /user/packages/{package_type}/{package_name}/versions/{package_version_id}', {
          package_type: 'container',
          package_name: packageName,
          package_version_id: version.id
        }).then((status) => {
          console.log(`Status: ${status.status}`);
        }));
      } else {
        deletion_promises.push(octokit.request('DELETE /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}', {
          package_type: 'container',
          package_name: packageName,
          org: org_user,
          package_version_id: version.id
        }).then((status) => {
          console.log(`Status: ${status.status}`);
        }));
      }
    }

    await Promise.all(deletion_promises)

    console.log("Done")
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();