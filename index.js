const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/core");
const octokit = new Octokit({ auth: core.getInput('token') });

octokit.hook.error("request", async (error, options) => {
  throw error;
});

const run = async () => {
  try {
    const packageName = core.getInput('package_name');
    const context = github.context;

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
    console.log(`Getting ${pkg.data.version_count} package versions`);

    versionsResponse = await octokit.request('GET /{type}s/{name}/packages/{package_type}/{package_name}/versions', {
      package_type: 'container',
      package_name: packageName,
      name: org_user,
      type: type
    })

    versions = versionsResponse.data

    for (const version of versions) {
      if (version.metadata.container.tags.length == 0) {
        console.log(`Deleting untagged version: ${version.name}`)

        if (type == "user") {
          status = await octokit.request('DELETE /user/packages/{package_type}/{package_name}/versions/{package_version_id}', {
            package_type: 'container',
            package_name: packageName,
            package_version_id: version.id
          })
        } else {
          status = await octokit.request('DELETE /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}', {
            package_type: 'container',
            package_name: packageName,
            org: org_user,
            package_version_id: version.id
          })
        }

        console.log(`Status: ${status.status}`)
      }
    }

    // versions = await octokit.request('GET /user/packages/{package_type}/{package_name}/versions', {
    //   package_type: 'package_type',
    //   package_name: 'package_name'
    // })

    // core.setOutput("pkg", pkg);

    
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();