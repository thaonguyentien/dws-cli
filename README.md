# DWS

> Publish web apps to a DWS with a single command and no setup required.

[![NPM](https://nodei.co/npm/dws-cli.png?global=true)](https://nodei.co/npm/dws-cli.png?global=true)

This is the CLI client for the [DWS](https://dws.datochain.com) hosted service. It’s what gets installed when you run `npm install -g dws-cli`.

This CLI library manages access tokens locally and handles the upload and subsequent reporting when you publish a project using dws.

## Usage



Run `dws --help` to see the following overview of the `dws` command...

```

Usage: dws <command> [options]

Commands:
  dws delete     Delete site
  dws list       List all sites you have access to
  dws plan       Show account plan
  dws login      Login
  dws remove     Remove content
  dws logout     Expire local token
  dws create     Create sites
  dws whoami     Show who you are logged in as
  dws --help     Show help
  dws --version  Show version number
  dws add        Add files, folder to existed site

Options:
  --version   Show version number                                      [boolean]
  -h, --help  Show help                                                [boolean]

Examples:
  dws add ./  Create a new website in the current directory

copyright 2020

```

