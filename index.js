#! /usr/bin/env node
const figlet = require('figlet');
const fs = require('fs');
const chalk = require('chalk');
const updateNotifier = require('update-notifier');
const inquirer = require("inquirer");
const axios = require("axios");
const showSize = require('./src/show-size.js');
const ora = require('ora');
let Table = require('cli-table3');
const pkg = require('./package.json');
const spinner = ora();
const ipfs = require("./src/ipfs");
const Configstore = require('configstore');
const scrape = require('website-scraper');
const path = require('path');
const opn = require("opn");

const conf = new Configstore(pkg.name);

updateNotifier({pkg, updateCheckInterval: 0}).notify();

process.on('SIGINT', function () {
    console.log("\n")
    global.ponr == true
        ? console.log("   Disconnected".green + "- Expected to complete.".grey)
        : console.log("   Aborted".yellow + " - Deployment not initiated.".grey)
    console.log()
    process.exit(1)
})

var argv = require('yargs')
    .scriptName('dws')
    .usage('Usage: $0 <command> [options]')
    .command('delete', 'Delete site', yargs => {
        return yargs
            .option('name', {
                demand: false,
                description: "Sites name",
                type: 'string',
            }).option('Y', {
                description: "-y/-Y if delete without confirm",
                type: 'string',
            }).alias('Y', 'y')
    })
    .command('preview', 'Preview sites', yargs => {
        return yargs
            .option('url', {
                demand: true,
                description: "Sites name",
                type: 'string',
            })
    })
    .command("ls", 'List site directory contents', yargs => {
        return yargs
            .option('path', {
                demand: true,
                default: ".",
                description: "Path from sites folder ",
                type: 'string',
            }).option('name', {
                demand: true,
                description: "Site name",
                type: 'string',
            }).alias('name', 'n')
            .alias('path', 'p')
    })
    .command("rm", 'Remove site files or directories ', yargs => {
        return yargs
            .option('path', {
                demand: true,
                description: "Path from sites folder ",
                type: 'string',
            })
            .option('name', {
                demand: true,
                description: "Site name",
                type: 'string',
            }).option('Y', {
                description: "-y/-Y if delete without confirm",
                type: 'string',
            })
            .alias('name', 'n')
            .alias('Y', 'y')
            .alias('path', 'p')
    })
    .command("list", 'List all sites you have access to ')
    .command("register", 'Create account', yargs => {
        return yargs
            .option('name', {
                description: "Username",
                type: 'string',
            }).option('email', {
                description: "Email",
                type: 'string',
            }).alias('name', 'n')
            .alias('email', 'e')
    })
    .command('plan', 'Show account plan')
    .command('login', 'Login', yargs => {
        return yargs
            .option('username', {
                demand: false,
                description: "Username",
                type: 'string',
            }).option('password', {
                demand: false,
                description: "Password",
                type: 'string',
            }).option('token', {
                demand: false,
                description: "Token",
                type: 'string',
            })
    })
    .command('replace', 'Replace content', yargs => {
        return yargs
            .option('wrap', {
                demand: true,
                description: "Wrap",
                type: 'string',
            }).option('path', {
                demand: false,
                description: "Path",
                type: 'string',
            }).option('name', {
                demand: false,
                description: "Site name",
                type: 'string',
            })

    })
    .command('logout', 'Expire local token')
    .command('create', 'Create sites', yargs => {
        return yargs
            .option('wrap', {
                demand: true,
                description: "Wrap",
                type: 'string',
            })
            .option('name', {
                demand: false,
                description: "Site name",
                type: 'string',
            }).option('path', {
                demand: false,
                description: "Path folder to upload",
                type: 'string',
            }).option('site-version', {
                demand: false,
                description: "Site version",
                type: 'string',
            }).option('path', {
                demand: false,
                description: "Path folder to upload",
                type: 'string',
            }).option('comment', {
                demand: false,
                description: "Comment",
                type: 'string',
            }).option('version', {
                demand: false,
                description: "Version",
                type: 'string',
            }).option('avatar', {
                demand: false,
                description: "Avatar link",
                type: 'string',
            })
    })
    .command('whoami', 'Show who you are logged in as')
    .command('--help', 'Show help')
    .command('--version', 'Show version number')
    .command('add', 'Add files, folder to existed site', yargs => {
        return yargs
            .option('wrap', {
                demand: false,
                description: "Wrap",
                type: 'string',
            }).option('path', {
                demand: false,
                description: "Path",
                type: 'string',
            }).option('name', {
                demand: false,
                description: "Site name",
                type: 'string',
            })
    })
    .demandCommand(1, "")
    .strict()
    .example('$0 add ./', 'Create a new website in the current directory')
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2020')
    .argv;
if (argv._.includes("ls")) {
    let token = getToken();
    spinner.start("Listing directory contents");
    if (argv.path === "..") {
        spinner.fail("Cannot list parent directory sites")
        process.exit(1)
    }

    axios.get("https://api.datohost.com/hosting/v1/owner-site/" + argv.name, {
        headers: {
            Authorization: token
        }
    }).then(response => {
        if (response.data.status === "fail") {
            spinner.fail("❌❌❌ " + response.data.data.message);
            process.exit(1);
        }
        ipfs.ls(argv.name, argv.path).then(
            result => {
                spinner.stop("Listing directory contents");
                if (result[0] === true) {
                    console.log(result[1]);
                } else {
                    spinner.fail("❌❌❌ " + result[1]);
                    process.exit(1)
                }
            }
        )
    }).catch(error => {
        spinner.fail("❌❌❌ " + error.message);
        process.exit(1)
    })
}
if (argv._.includes("rm")) {

    let questions = [];
    if (argv.y === undefined) {
        questions.push({
            type: 'confirm',
            name: 'is_deleted',
            message: "Do you want to delete this?",
        })
    }


    inquirer.prompt(questions).then(async answers => {
        if (answers) {
            answers.is_deleted = true
        }
        if (answers.is_deleted === true) {
            let token = getToken();
            spinner.start("Removing directory/file");
            if (argv.path === "..") {
                spinner.fail("Cannot remove parent directory sites")
                process.exit(1)
            }
            axios.get("https://api.datohost.com/hosting/v1/owner-site/" + argv.name, {
                headers: {
                    Authorization: token
                }
            })
                .then(response => {
                    if (response.data.status === "fail") {
                        spinner.fail("❌❌❌ " + response.data.data.message);
                        process.exit(1);
                    }
                    let site_id = response.data.data.site_id;
                    if (argv.path === ".") {
                        ipfs.delete_all_file_ipfs(argv.name)
                            .then(async result_deletion => {
                                if (result_deletion[0]) {
                                    try {
                                        response = await axios.put("https://api.datohost.com/hosting/v1/sites/" + site_id,
                                            {CID: result_deletion[1]},
                                            {
                                                headers: {
                                                    Authorization: token
                                                }
                                            });
                                        if (response.data.status === "success") {
                                            spinner.succeed(" Remove directory/file successfully");
                                        } else {
                                            spinner.fail("❌❌❌ " + response.data.data.message);
                                            process.exit(1);
                                        }

                                    } catch (error) {
                                        spinner.stop("Removing directory/file");
                                        spinner.fail(" ❌❌❌ " + error.message);
                                        process.exit(1)
                                    }
                                } else {
                                    spinner.stop("Removing directory/file");
                                    spinner.fail(" ❌❌❌ " + result_deletion[1]);
                                    process.exit(1)
                                }
                            })

                    } else {
                        let path = argv.name + "/" + argv.path;
                        let site_name = argv.name;
                        ipfs.delete_folder_ipfs(path).then(
                            async result => {
                                if (result[0] === true) {
                                    try {
                                        let cid = await ipfs.get_cid(site_name);
                                        response = await axios.put("https://api.datohost.com/hosting/v1/sites/" + site_id,
                                            {
                                                CID: cid
                                            },
                                            {
                                                headers: {
                                                    Authorization: token
                                                }
                                            });
                                        spinner.stop("Removing directory/file");
                                        if (response.data.status === "success") {
                                            spinner.succeed(" Remove directory/file successfully");
                                        } else {
                                            spinner.fail("❌❌❌ " + response.data.data.message);
                                            process.exit(1);
                                        }

                                    } catch (error) {
                                        spinner.start("Removing directory/file");
                                        spinner.fail(" ❌❌❌ " + error.message);
                                        process.exit(1)
                                    }
                                } else {
                                    spinner.stop("Removing directory/file");
                                    spinner.fail("❌❌❌ " + result[1]);
                                    process.exit(1)
                                }
                            }
                        )
                    }
                })
                .catch(error => {
                    spinner.fail("❌❌❌ " + error.message);
                    process.exit(1)
                })
        }
    })

}
if (argv._.includes("delete")) {
    let questions = [];
    if (!argv.name) {
        questions.push({
            type: 'input',
            name: 'name',
            message: "Site name :",
            validate: function (value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter site name';
                }
            }
        })
    }
    if (argv.y === undefined) {
        questions.push({
            type: 'confirm',
            name: 'is_deleted',
            message: "Do you want to delete this site ?",
        });
    }


    inquirer.prompt(questions).then(async answers => {
        if (answers.is_deleted === undefined) {
            answers.is_deleted = true
        }
        if (answers.is_deleted === true) {
            spinner.start(" 🚗 🚗 🚗 Deleting site");
            answers.name = answers.name ? answers.name : argv.name;
            let token = getToken();

            let response = "";
            try {
                response = await axios.get("https://api.datohost.com/hosting/v1/owner-site/" + answers.name, {
                    headers: {
                        Authorization: token
                    }
                });
                if (response.data.status === "fail") {
                    spinner.fail("❌❌❌ " + response.data.data.message);
                    process.exit(1)
                }
            } catch (error) {
                spinner.fail("❌❌❌ " + error.message);
                process.exit(1)
            }
            let site_id = response.data.data.site_id;
            let save_ipfs = await ipfs.delete_folder_ipfs(answers.name);
            if (save_ipfs[0] === false) {
                spinner.fail("❌❌❌" + save_ipfs[1]);
                process.exit(1)

            }
            try {
                response = await axios.delete(
                    "https://api.datohost.com/hosting/v1/sites/" + site_id,
                    {
                        headers: {
                            Authorization: token
                        }
                    }
                );
            } catch (error) {
                spinner.fail("❌❌❌ " + error.message);
                process.exit(1)
            }
            spinner.stop("Deleting site");
            if (response.data.status === "success") {
                spinner.succeed(response.data.data.message)
            } else {
                spinner.fail("❌❌❌ " + response.data.data.message)
                process.exit(1)
            }
        }
    })

}
if (argv._.includes("list")) {
    spinner.start(" 🚗 🚗 🚗 Listing sites: ...");
    let token = getToken();

    axios.get("https://api.datohost.com/hosting/v1/sites", {
        headers: {
            Authorization: token
        }
    }).then(res => {
        if (res.data.status === "fail") {
            spinner.fail("❌❌❌ " + res.data.data.message);
            process.exit(1)
        }
        const table = new Table({
            head: ['Id', "Url", 'Name', 'Site id', 'Last update', "Status", "CID"],
            // colWidths: [4, 20, 18, 7, 1, 3],
            // wordWrap: true
            chars: {
                'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗'
                , 'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝'
                , 'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼'
                , 'right': '║', 'right-mid': '╢', 'middle': '│'
            },
            style: {
                head: ["blue"], //disable colors in header cells
                border: [], //disable colors for the border
            }
        });
        let i = 1;
        res.data.data.forEach(element => {

            table.push([
                i, "https://" + element['name'] + ".datochain.com", element['name'], element['site_id'], element['create_time'],
                element['status'], element['CID']
            ]);
            i = i + 1;
        });
        spinner.stop("Listing sites: ...");
        console.log(table.toString());
    }).catch(function (error) {
        spinner.fail("❌❌❌ " + error.message)
        process.exit(1)
    })
}
if (argv._.includes("register")) {
    let questions = [];
    if (!argv.n) {
        questions.push({
            type: 'input',
            name: 'name',
            message: "User name :",
            validate: function (value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter site name';
                }
            }
        })
    }
    if (!argv.e) {
        questions.push({
            type: 'input',
            name: 'name',
            message: "Site name :",
            validate: function (value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter site name';
                }
            }
        })
    }
    questions.push({
        type: 'password',
        name: 'password',
        message: "Password:",
        validate: function (value) {
            if (value.length) {
                return true;
            } else {
                return 'Please enter password';
            }
        },
        mask: function (input) {
            return '*' + new Array(String(input).length).join('█');
        }
    }, {
        type: 'password',
        name: 'repeated_password',
        message: "Repeated password:",
        validate: function (value) {
            if (value.length) {
                return true;
            } else {
                return 'Please enter repeated password';
            }
        },
        mask: function (input) {
            return '*' + new Array(String(input).length).join('█');
        }
    });
    inquirer.prompt(questions).then(async answers => {
        if (answers.password !== answers.repeated_password) {
            spinner.fail('❌❌❌ ' + "password and repeated password is different")
            process.exit(1)

        }
        answers.email = answers.email ? answers.email : argv.email;
        answers.username = answers.name ? answers.name : argv.name;
        try {
            let response = await axios.post("http://api.datohost.com/accounts/users", answers);
            if (response.data.status === "success") {
                spinner.succeed("Account created. We'll send an email to " + answers.email
                    + ". Open it up to activate your account")
            } else {
                spinner.fail('❌❌❌ ' + response.data.data.message)
                process.exit(1)

            }
        } catch (e) {
            spinner.fail('❌❌❌ ' + e.message);
            process.exit(1)
        }
    })
}
if (argv._.includes("plan")) {
    spinner.start(" 🚗 🚗 🚗 Loading plan");
    let token = getToken()

    let user_id = getStoredUserId()
    axios.get(
        "http://api.datohost.com/accounts/users/" + user_id,
        {headers: {Authorization: "Bearer " + token}})
        .then(res => {
            if (res.data.status === "fail") {
                spinner.fail("❌❌❌ " + res.data.data.message);
                process.exit(1)
            }
            let plan_type = res.data.data.plan_hosting.plan_type;
            let due_date_timestamp = res.data.data.plan_hosting.due_date;
            spinner.stop("Loading plan");
            let table = new Table({
                chars: {
                    'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗'
                    , 'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝'
                    , 'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼'
                    , 'right': '║', 'right-mid': '╢', 'middle': '│'
                },
                style: {
                    border: [], //disable colors for the border
                }
            });
            table.push([{colSpan: 2, content: 'PLAN TABLE', hAlign: "center"}]);

            table.push(
                [{content: chalk.blue("Username")}, {content: res.data.data.username}],
                [{content: chalk.blue("Email")}, {content: res.data.data.email}],
                [{content: chalk.blue("Balance")}, {content: res.data.data.balance}],
                [{content: chalk.blue("Phone")}, {content: res.data.data.phone}],
                [{content: chalk.blue("Plan type")}, {content: plan_type}]
            );
            if (plan_type === "FREE") {
                table.push(
                    [{content: chalk.blue("Due date")}, {content: "Infinite"}]
                )
            } else {
                let due_date = new Date(due_date_timestamp * 1000);
                due_date = due_date.getMonth() + "/" + due_date.getDate() + "/" + due_date.getFullYear();
                table.push(
                    [{content: chalk.blue("Due date")}, {content: due_date}]
                )
            }
            console.log(table.toString());

        })
        .catch(function (error) {
            spinner.fail("❌❌❌ " + error.message)
            process.exit(1)
        })
}
if (argv._.includes("login")) {
    if (argv.token) {
        spinner.start(" 🚗 🚗 🚗 Loging in");
        token = argv.token;
        axios.get("http://api.datohost.com/accounts/v1/get-user-id",
            {headers: {Authorization: "Bearer " + token}})
            .then(res => {
                if (res.data.status === "fail") {
                    spinner.stop(" 🚗 🚗 🚗 Loging in");
                    spinner.fail("❌❌❌ " + res.data.data.message);
                    conf.clear();
                    process.exit(1)
                }
                let user_id = res.data.data.user_id;
                let username = res.data.data.name;
                conf.set('dws.token', argv.token);
                conf.set('dws.username', username);
                conf.set('dws.user_id', user_id);
                spinner.stop(" 🚗 🚗 🚗 Loging in");
                spinner.succeed("Login as " + username);
            })
            .catch(function (error) {
                spinner.stop(" 🚗 🚗 🚗 Loging in");
                spinner.fail("❌❌❌ " + error.message);
                conf.clear();
                process.exit(1)
            });
    } else {
        let questions = [];
        if (!argv.username) {
            questions.push({
                type: 'input',
                name: 'username',
                message: "Username: ",
                validate: function (value) {
                    if (value.length) {
                        return true;
                    } else {
                        return 'Please enter username';
                    }
                }
            })
        }
        if (!argv.password) {
            questions.push({
                type: 'password',
                name: 'password',
                message: "Password:",
                validate: function (value) {
                    if (value.length) {
                        return true;
                    } else {
                        return 'Please enter password';
                    }
                },
                mask: function (input) {
                    return '*' + new Array(String(input).length).join('█');
                }
            })
        }
        inquirer.prompt(questions).then(async answers => {
            spinner.start(" 🚗 🚗 🚗 Loging in");
            answers.username = answers.username ? answers.username : argv.username;
            answers.password = answers.password ? answers.password : argv.password;
            // console.log(answers);
            axios.post("http://api.datohost.com/accounts/login", answers)
                .then(res => {
                    if (res.data.status === "fail") {
                        spinner.fail(" ❌❌❌ " + res.data.data.message);
                        process.exit(1)
                    }
                    token = res.data.data.token;
                    user_id = res.data.data.user_id;
                    spinner.stop("Loging in");
                    if (token === undefined) {
                        spinner.fail("❌❌❌ " + res.data.data.message);
                        conf.clear();
                        process.exit(1)
                    } else {
                        conf.set('dws.token', token);
                        conf.set('dws.username', answers.username);
                        conf.set('dws.user_id', user_id);
                        spinner.succeed("Login as " + answers.username);

                    }
                })
                .catch(function (error) {
                    spinner.fail('❌❌❌ ' + error.message);
                    conf.clear();
                    process.exit(1);
                })
        });
    }

}
if (argv._.includes("replace")) {
    let questions = [];
    if (!argv.name) {
        questions.push({
            type: 'input',
            name: 'name',
            message: "Site name:",
            validate: function (value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter site name';
                }
            }
        })
    }
    if (!argv.path) {
        questions.push({
            type: 'input',
            name: 'path',
            message: "Path: ",
            validate: function (value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter username';
                }
            }
        })
    }
    inquirer.prompt(questions).then(async answers => {
        answers.name = answers.name ? answers.name : argv.name;
        answers.path = answers.path ? answers.path : argv.path;
        answers.wrap = argv.wrap;
        let token = getToken();
        spinner.start("🚗 🚗 🚗 Replacing data ...");

        let response = "";
        try {
            response = await axios.get("https://api.datohost.com/hosting/v1/owner-site/" + answers.name, {
                headers: {
                    Authorization: token
                }
            });
        } catch (error) {
            spinner.fail(" ❌❌❌ " + error.message);
            process.exit(1)
        }
        if (response.data.status === "fail") {
            spinner.fail("❌❌❌ " + response.data.data.message);
            process.exit(1)
        }
        let site_id = response.data.data.site_id;
        const readableSize = await showSize(answers.path);
        if (!readableSize) {
            spinner.fail(" 🔥 🔥 🔥 Cannot read data from path!");
            process.exit(1)
        }
        ipfs.delete_all_file_ipfs(answers.name);
        let result_deletion = await ipfs.append_folder(answers.name, answers.path, answers.wrap);

        if (result_deletion[0]) {
            try {
                response = await axios.put("https://api.datohost.com/hosting/v1/sites/" + site_id,
                    {CID: result_deletion[1]},
                    {
                        headers: {
                            Authorization: token
                        }
                    });
                spinner.stop("🚗 🚗 🚗 Replacing data ...");
                if (response.data.status === "success") {
                    spinner.succeed("Add successfully");
                } else {
                    spinner.fail("❌❌❌ " + response.data.data.message);
                    process.exit(1);
                }

            } catch (error) {
                spinner.stop("🚗 🚗 🚗 Replacing data ...");
                spinner.fail(" ❌❌❌ " + error.message);
                process.exit(1)
            }
        } else {
            spinner.stop("🚗 🚗 🚗 Replacing data ...");
            spinner.fail(" ❌❌❌" + result_deletion[1]);
            process.exit(1)
        }
    });

}
if (argv._.includes("logout")) {
    conf.clear();
    spinner.succeed(" 🎊🎊🎊Logout success!")
}
if (argv._.includes("create")) {
    let questions = [];
    if (!argv.name) {
        questions.push({
            type: 'input',
            name: 'name',
            message: "Name: ",
            validate: function (value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter a name for the sites.';
                }
            }
        })
    }
    if (!argv.path) {
        questions.push({
            type: 'input',
            name: 'path',
            message: "Folder path:",
            validate: function (value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter folder path ';
                }
            }
        })
    }
    inquirer.prompt(questions).then(async answers => {
        answers.name = answers.name ? answers.name : argv.name;
        answers.path = answers.path ? answers.path : argv.path;
        answers.wrap = argv.wrap;
        if (argv.comment) {
            answers.comment = argv.comment;
        }
        if (argv.siteVersion) {
            answers.version = argv.siteVersion;
        }
        if (argv.avatar) {
            answers.site_avatar = argv.avatar;
        }
        let token = getToken();
        const readableSize = await showSize(answers.path);
        if (!readableSize) {
            spinner.fail(" 🔥🔥🔥 Cannot read data from path!");
            process.exit(1)
        }
        spinner.start(" 🚗 🚗 🚗 Adding site");
        let user_id = getStoredUserId();
        // console.log(user_id)
        let response = '';
        try {
            response = await axios.get("https://api.datohost.com/hosting/v1/sites", {
                headers: {
                    Authorization: token
                }
            });
        } catch (error) {
            spinner.fail("❌❌❌ " + error.message);
            process.exit(1);
        }
        let number_sites = response.data.data.length;
        try {
            response = await axios.get(
                "http://api.datohost.com/accounts/users/" + user_id,
                {
                    headers:
                        {
                            Authorization:
                                "Bearer " + token
                        }
                });
        } catch (error) {
            spinner.fail("❌❌❌ " + error.message);
            process.exit(1);
        }
        let plan_type = response.data.data.plan_hosting.plan_type.toLowerCase();
        let check_plan = (plan_type === "free" && number_sites < 1) || (plan_type === "pro" && number_sites < 3) || (plan_type === "business" && number_sites < 30);
        if (check_plan === false) {
            spinner.fail(" 🔥🔥🔥 You created max sites!! Upgrade plan to continue!!")
            process.exit(1)
        }
        let check_duplicate = await ipfs.check_duplicate_folder(answers.name);
        if (check_duplicate === true) {
            spinner.fail(" 🔥🔥🔥 This subdomain already exists, please choose another subdomain");
            process.exit(1)
        }
        // spinner.info("Uploading file");
        let cid = await ipfs.save_to_ipfs(answers.path, answers.name, answers.wrap);

        answers.CID = cid;
        answers.createTime = get_time();
        answers.lastUpdate = 1;
        // if (!answers.version) {
        //     answers.version = "1.0.0"
        // }
        axios.post(
            "https://api.datohost.com/hosting/v1/sites",
            answers,
            {
                headers:
                    {
                        Authorization: token
                    }
            })
            .then(res => {
                spinner.stop("🚗🚗🚗 Adding site");

                if (res.data.status === "success") {
                    spinner.succeed(` 🎉🎉🎉 Create site success: https://${answers.name}.datochain.com`);
                    // const childProcess = doOpen(url)

                } else {
                    spinner.fail(`🔥🔥🔥 Couldn't create site: ${res.data.data.message}`)
                    process.exit(1)
                }
            })
            .catch(function (error) {
                spinner.fail("❌❌❌ " + error.message);
                process.exit(1)
            })


    });
}
if (argv._.includes("whoami")) {
    let username = getStoredUsername();
    if (!username) {
        spinner.warn(" 🎉🎉🎉You are not login");
        process.exit(1)
    }
    spinner.info("😄😄😄You are " + username);

}
if (argv._.includes("add")) {
    let questions = [];
    if (!argv.name) {
        questions.push({
            type: 'input',
            name: 'name',
            message: "Site name:",
            validate: function (value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter site name';
                }
            }
        })
    }
    if (!argv.path) {
        questions.push({
            type: 'input',
            name: 'path',
            message: "Path: ",
            validate: function (value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter username';
                }
            }
        })
    }
    let stat = fs.lstatSync(argv.path);
    if (stat.isDirectory()) {
        if (!argv.wrap) {
            questions.push({
                type: 'input',
                name: 'wrap',
                message: "Wrap options(true/fasle): ",
                validate: function (value) {
                    if (value.length) {
                        return true;
                    } else {
                        return 'Please enter username';
                    }
                }
            })
        }
    }
    inquirer.prompt(questions).then(async answers => {
        answers.name = answers.name ? answers.name : argv.name;
        answers.path = answers.path ? answers.path : argv.path;
        answers.wrap = argv.wrap || false;
        let token = getToken();
        spinner.start("🚗 🚗 🚗 Adding data ...");

        let response = "";
        try {
            response = await axios.get("https://api.datohost.com/hosting/v1/owner-site/" + answers.name, {
                headers: {
                    Authorization: token
                }
            });
        } catch (error) {
            spinner.fail(" ❌❌❌ " + error.message);
            process.exit(1)
        }
        if (response.data.status === "fail") {
            spinner.fail("❌❌❌ " + response.data.data.message);
            process.exit(1)
        }
        let site_id = response.data.data.site_id;
        const readableSize = await showSize(answers.path);
        if (!readableSize) {
            spinner.fail(" 🔥 🔥 🔥 Cannot read data from path!");
            process.exit(1)
        }
        let result_deletion = await ipfs.append_folder(answers.name, answers.path, answers.wrap);
        if (result_deletion[0]) {
            try {
                response = await axios.put("https://api.datohost.com/hosting/v1/sites/" + site_id,
                    {CID: result_deletion[1]},
                    {
                        headers: {
                            Authorization: token
                        }
                    });
                spinner.stop("🚗 🚗 🚗 Adding data ... ");
                if (response.data.status === "success") {
                    if (result_deletion[2] !== undefined) {
                        spinner.succeed(result_deletion[2]);
                    } else {
                        spinner.succeed("Add successfully");
                    }
                } else {
                    spinner.fail("❌❌❌ " + response.data.data.message);
                    process.exit(1);
                }

            } catch (error) {
                spinner.stop("Adding ");
                spinner.fail(" ❌❌❌ " + error.message);
                process.exit(1)
            }
        } else {
            spinner.stop("Adding ");
            spinner.fail(" ❌❌❌" + result_deletion[1])
            process.exit(1)
        }
    });

}
if (argv._.includes("preview")) {
    let time_string = new Date().getTime().toString();

    fs.access(path.resolve(__dirname, "preview-temps/"), function (error) {
        if (error) {
            fs.mkdir(path.resolve(__dirname, "preview-temps/"), () => {
            })
        }
        let folderPath = path.resolve(__dirname, "preview-temps/" + time_string);
        spinner.start(" 🚗 🚗 🚗 Crawling");
        url = argv.url;
        scrape({
            urls: [url],
            directory: folderPath
        }).then((result) => {
            spinner.stop(" 🚗 🚗 🚗 Crawling");
            spinner.succeed(" 🚗 🚗 🚗 Crawling done");
            spinner.start(" 🚗 🚗 🚗 Pushing to IPFS");
            ipfs.add_folder_to_ipfs(folderPath, "/preview-temps/" + time_string).then(function (cid) {
                spinner.stop(" 🚗 🚗 🚗 Pushing to IPFS");
                spinner.succeed(" 🚗 🚗 🚗 Pushing to IPFS done");
                spinner.succeed("http://gateway.datochain.com/ipfs/" + cid);
                opn("http://gateway.datochain.com/ipfs/" + cid)
            })
        })
    })
}

if (argv.help) {
    readModuleFile('./help.md', function (err, words) {
        console.log(words);
    });
}
if (argv.logo) {
    printLogo()
}

function readModuleFile(path, callback) {
    try {
        var filename = require.resolve(path);
        fs.readFile(filename, 'utf8', callback);
    } catch (e) {
        callback(e);
    }
}


function printLogo() {
    figlet('DWS-CLI!!', function (err, data) {
        if (err) {
            console.log('Something went wrong...');
            return;
        }
        console.log(data)
    });
}


function getStoredUsername() {
    return conf.get('dws.username');
}

function getStoredUserId() {
    return conf.get('dws.user_id');
}

function getToken() {
    let token = conf.get('dws.token');
    if (!token) {
        spinner.fail(" 🔥🔥🔥 You are not login");
        process.exit(1)
    } else {
        return token
    }
}


function get_time() {
    let ts = Date.now();
    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    let month = date_ob.getMonth() + 1;
    let year = date_ob.getFullYear();
    return month + "/" + date + "/" + year
}

