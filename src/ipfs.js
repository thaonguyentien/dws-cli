const IpfsHttpClient = require('ipfs-http-client');
const {globSource} = IpfsHttpClient;
const ipfs = IpfsHttpClient("/ip4/178.128.217.254/tcp/5001/http");
const cliProgress = require('cli-progress');
const fs = require('fs');
const util = require('util');
let Table = require('cli-table3');



const readdir = util.promisify(fs.readdir);


async function save_to_ipfs(path, site_name, is_wrap) {
    let path_array = path.split("/");
    let folder_name = path_array[path_array.length - 1];
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    let count = 0;
    let files = await readdir(path);
    let totalFiles = files.length + 1;
    count = 100 / totalFiles;
    bar.start(100, 0);
    let cid = "";
    let process_percent = 0;
    for await (const file of ipfs.add(globSource(path, {recursive: true}))) {
        cid = file.cid;
        process_percent = process_percent + count;
        bar.update(Math.round(process_percent))
    }
    bar.stop();
    // cid = cid.toString();

    let source = `/ipfs/${cid}`;
    if (is_wrap === "true") {
        await make_dir_ipfs(site_name);
        let path_site = `/${site_name}/${folder_name}`;
        await ipfs.files.cp([source, path_site]);
        const stats = await ipfs.files.stat('/' + site_name);
        cid = stats.cid.toString();
    } else {
        let path_site = `/${site_name}`;
        await ipfs.files.cp([source, path_site]);
        const stats = await ipfs.files.stat('/' + site_name);
        cid = stats.cid.toString();
    }
    return cid;
}

async function check_duplicate_folder(folder_name) {
    let is_duplicate = false;
    try {
        for await (const file of ipfs.files.ls("/" + folder_name)) {
            is_duplicate = true;
        }
    } catch (e) {
        is_duplicate = false;
    }

    return is_duplicate

}

async function ls(site_name, path) {
    try {
        let table = new Table({
            chars: {
                'top': '', 'top-mid': '', 'top-left': '', 'top-right': ''
                , 'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': ''
                , 'left': '', 'left-mid': '', 'mid': '', 'mid-mid': ''
                , 'right': '', 'right-mid': '', 'middle': ' '
            },
            style: {'padding-left': 1, 'padding-right': 1}
        });
        // table.push([{colSpan: 2, content: 'PLAN TABLE', hAlign: "center"}]);
        for await (const file of ipfs.files.ls("/" + site_name + "/" + path)) {
            table.push(
                [{content: !file.type ? "f" : "d"}, {content: file.size}, {content: file.name}])
        }
        return [true, table.toString()]
    } catch (e) {
        return [false, "Incorrect path "]
    }
}

async function delete_folder_ipfs(folder_name) {

    try {
        // console.log(folder_name)
        await ipfs.files.rm('/' + folder_name, {recursive: true});

        return [true, "Removing successfully"];
    } catch (e) {
        // console.log(e.message)
        return [false, e.message];
    }
}

async function get_cid(path) {
    const stats = await ipfs.files.stat('/' + path);
    return stats.cid.toString();
}

async function make_dir_ipfs(folder_name) {
    try {
        let a = await ipfs.files.mkdir('/' + folder_name);
        return true;
    } catch (e) {
        return false;
    }

}

async function delete_all_file_ipfs(folder_name) {
    try {
        for await (const file of ipfs.files.ls("/" + folder_name)) {
            await ipfs.files.rm('/' + folder_name + "/" + file.name, {recursive: true});
        }
        stats = await ipfs.files.stat('/' + folder_name);
        return [true, stats.cid.toString()];
    } catch (e) {
        return [false, e.message]
    }
}

async function append_folder(site_name, path, is_wrap) {
    let stats = 0;
    //check with file
    try {
        let stat = fs.lstatSync(path);

        if (stat.isFile()) {
            let path_array = path.split("/");
            let file_name = path_array[path_array.length - 1];
            for await (const file of ipfs.files.ls("/" + site_name)) {

                if (file_name === file.name) {
                    return [false, "File name already exist"];
                }
            }
            let cid_file = "";
            console.log(123)
            for await (const file of ipfs.add(globSource(path))) {
                cid_file = file.cid.toString();
                await ipfs.files.cp([`/ipfs/${file.cid.toString()}`, `/${site_name}/${file_name}`]);
            }
            stats = await ipfs.files.stat('/' + site_name);
            return [true, stats.cid.toString(), cid_file];

        }
    } catch (e) {
        return [false, e.message];

    }
    let path_array = path.split("/");
    let folder_name = path_array[path_array.length - 1];
    if (is_wrap === "true") {
        let cid = "";
        let cid_folder = "";
        try {
            for await (const file of ipfs.files.ls("/" + site_name)) {
                if (folder_name === file.name) {
                    return [false, "Folder name already exist"];
                }
            }
            for await (const file of ipfs.add(globSource(path, {recursive: true}))) {
                cid_folder = file.cid;
            }
            let source = `/ipfs/${cid_folder}`;
            let path_site = `/${site_name}/${folder_name}`;
            await ipfs.files.cp([source, path_site]);
            const stats = await ipfs.files.stat('/' + site_name);
            cid = stats.cid.toString();
            return [true, cid, cid_folder.toString()];
        } catch (e) {
            return [false, e.message];
        }
    } else {
        try {
            let array_file = await readdir(path);
            for await (const file of ipfs.files.ls("/" + site_name)) {
                if (array_file.includes(file.name)) {
                    return [false, (file.type === 1 ? "Folder" : "File") + " name already exist"];
                }
            }
            for await (const file of ipfs.add(globSource(path, {recursive: true}))) {
                cid = file.cid;
                let path_file = file.path.replace(folder_name + "/", "");
                if (file.path !== folder_name && !path_file.includes("/")) {
                    let source = `/ipfs/${cid}`;
                    let path_site = `/${site_name}/${path_file}`;
                    await ipfs.files.cp(source, path_site);
                }
            }
            stats = await ipfs.files.stat('/' + site_name);
            return [true, stats.cid.toString()];
        } catch (e) {
            return [false, e.message];
        }
    }
}

async function add_folder_to_ipfs(folderPath, ipfsPath) {
    let cid = "";
    for await (const file of ipfs.add(globSource(folderPath, {recursive: true}))) {
        cid = file.cid;
    }
    await ipfs.files.cp("/ipfs/" + cid.toString(), ipfsPath);
    const stats = await ipfs.files.stat(ipfsPath);
    return stats.cid.toString()

}


function RemoveLastDirectoryPartOf(the_url) {
    var the_arr = the_url.split('/');
    the_arr.pop();
    return (the_arr.join('/'));
}

module.exports = {
    save_to_ipfs,
    check_duplicate_folder,
    delete_folder_ipfs,
    delete_all_file_ipfs,
    make_dir_ipfs,
    append_folder,
    ls,
    get_cid,
    add_folder_to_ipfs
}