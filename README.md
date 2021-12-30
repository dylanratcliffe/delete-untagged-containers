# Delete untagged containers

Deletes containers that do not have tags from [Github container registry](https://docs.github.com/en/packages/guides/about-github-container-registry) (ghcr.io)

Note that this has not been fully tested with non-user orgs as the APIs differ. Use at your own risk

## Inputs

### `package_name`

**Required:** The name of the package to delete

### `token`

**Required:** Access token to use for deleting packages

### `org`

**Required:** The name of the org that the package belongs to (if an organization, otherwise you can use `user` or rely on automatic detection)

### `user`

**Required:** The name of the user that the package belongs to

## Example usage

### Github Actions

It is now possible (and recommended) to use an automatic [Github Actions token](https://docs.github.com/en/actions/security-guides/automatic-token-authentication) rather than a person access token. Which repos are allowed to access which packages can be configured in "Manage Actions access" under the settings for a given package.

**NOTE:** This does not work with org-scoped packages. If you're having `Package not found` errors when using `secrets.GITHUB_TOKEN`, try using a personal access token instead. Follow [this thread](https://github.community/t/github-token-cannot-access-private-packages) for details.

```yaml
name: Remove old package versions
on:
  workflow_dispatch:
    inputs:
      package_name:
        description: 'The name of the package to delete'     
        required: true

jobs:
  remove-package-versions:
    runs-on: ubuntu-latest
    steps:
      - name: purge packages
        uses: dylanratcliffe/delete-untagged-containers@main
        with:
          package_name: ${{ github.event.inputs.package_name }}
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Personal Access token

This example uses a [personal access token](https://docs.github.com/en/enterprise-server@3.3/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) with the following permissions:

* `read:packages`
* `write:packages`
* `delete:packages`

```yaml
name: Remove old package versions
on:
  workflow_dispatch:
    inputs:
      package_name:
        description: 'The name of the package to delete'     
        required: true

jobs:
  remove-package-versions:
    runs-on: ubuntu-latest
    steps:
      - name: purge packages
        uses: dylanratcliffe/delete-untagged-containers@main
        with:
          package_name: ${{ github.event.inputs.package_name }}
          # This is a person access token
          token: ${{ secrets.CR_PAT }}
```