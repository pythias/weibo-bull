// 1. 使用 chrome 打开 https://huodong.weibo.cn/nwt2022/ （确保你登录了微博）
// 2. 打开调试窗口，在 console 中贴下面的代码后回车

const NWT_URL = 'https://huodong.weibo.cn/nwt2022/';

let my_token = "", map_props = {}, my_props = {}, my_bag = { 'small': [], 'medium': [], 'large': [] };

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function post_sync(url, data, callback) {
    let http = new XMLHttpRequest();
    http.open('POST', url, false);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=utf-8');
    http.send(data);
    if (http.status !== 200) {
        return undefined;
    }

    try {
        let json = JSON.parse(http.responseText);
        if (callback && json.data) {
            return callback(json.data);
        } else {
            return json;
        }
    } catch (error) {
        return undefined;
    }
}

async function post(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
        body: data
    });
    return response.json().then(json => {
        if (json.code == 10000 && json.data !== undefined) {
            return json.data;
        }

        return {};
    });
}

function get_touch_users() {
    let url = NWT_URL + 'aj_touchuid';
    return post_sync(url, '', (data) => {
        return data;
    });
}

async function my_home() {
    let url = NWT_URL + "aj_index";
    post_sync(url, '', (data) => {
        map_props = data.mapProp;
        my_token = data.pagetoken;

        Object.keys(data.allProp).forEach(id => {
            my_props[id] = data.allProp[id];
        });

        my_bag.small = data.bag[3]["useprop"];
        my_bag.medium = data.bag[2]["useprop"];
        my_bag.large = data.bag[1]["useprop"];
    });

    return true;
}

async function get_props() {
    let url = NWT_URL + "aj_myprop";
    post_sync(url, '', (data) => {
        if (data.allProp === undefined) {
            return;
        }

        Object.keys(data.allProp).forEach(id => {
            my_props[id] = data.allProp[id];
        });

        my_bag.small = data.bag[3]["useprop"];
        my_bag.medium = data.bag[2]["useprop"];
        my_bag.large = data.bag[1]["useprop"];
    });

    return true;
}

async function go_build(props, prefix) {
    for (var i = 0; i < props.length; i++) {
        await sleep(1000);
        const prop = props[i];
        if (prop.num == 0) {
            continue;
        }

        const pos = Object.keys(map_props).find(p => p.indexOf(prefix) === 0 && map_props[p] == 0);
        map_build(prop, pos);
    }
    return true;
}

async function go_build_small() {
    return go_build(my_bag.small, 'c');
}

async function go_build_medium() {
    return go_build(my_bag.medium, 'b');
}

async function go_build_large() {
    return go_build(my_bag.large, 'a');
}

function map_build(prop, pos) {
    let url = NWT_URL + "aj_mapsetprop";
    let query = new URLSearchParams();
    query.append('new', prop.new);
    query.append('propid', prop.prop_id);
    query.append('pos', pos);
    query.append('pagetoken', my_token);

    const response = post_sync(url, query.toString());
    if (response.code != 10000) {
        console.error(response);
        return false;
    }

    console.log("建造'%s'成功, 位置在 '%s'", my_props[prop.prop_id].prop_name, pos);
    if (response.data.index.pagetoken) {
        my_token = response.data.index.pagetoken;
    }
    map_props[pos] = prop.prop_id;
    return true;
}

function go_home(user) {
    let url = NWT_URL + "aj_index?uid=" + user;
    const home = post_sync(url);
    return go_touch(user, home.data);
}

function go_touch(user, home_data) {
    let url = NWT_URL + "aj_tasktouch?netreqid=x&src=me&clientfrom=10C1193010&current_uid=" + home_data.desc.myuid;
    let query = new URLSearchParams();
    query.append('touch_uid', user);
    query.append('enpids', home_data.desc.enpids);
    query.append('pagetoken', home_data.pagetoken);

    const response = post_sync(url, query.toString());
    if (response.code == 611119) {
        return false;
    }

    if (response.data.propInfo) {
        console.log("摸到 %s 的 %s", response.data.propInfo.screen_name, response.data.propInfo.prop_name);
        return true;
    } else {
        return false;
    }
}

async function go_sign() {
    let url = NWT_URL + 'aj_sign';

    let json = post_sync(url);
    switch (json.code) {
        case 10000:
            console.log("成功签到");
            break;
        case 20004:
            console.log("已经签过");
            break;
        default:
            console.error(json);
            break;
    }

    return true;
}

async function go_homes(users) {
    for (var i = 0; i < users.length; i++) {
        await sleep(1000);
        if (go_home(users[i]) == false) {
            console.log("今日摸摸已完成");
            break;
        }
    }

    return true;
}

function get_blogs(type) {
    let page = 0;
    let lists = [];
    while (true) {
        let url = NWT_URL + 'aj_mbloglist?prop_id=0&type=' + type + '&v_p=89&from=10C1193010&page=' + page;
        let data = post_sync(url, '', (data) => {
            return data;
        });
        lists = lists.concat(data.list);
        page++;

        if (data.hasnext == 0) {
            break;
        }
    }
    
    return lists;
}

async function go_blogs(blogs) {
    let count = 0;
    for (var i = 0; i < blogs.length; i++) {
        await sleep(1000);
        if (go_blog(blogs[i])) {
            count++;
        }

        if (count >= 10) {
            break;
        }
    }

    console.log("转发已完成");
    return true;
}

function go_blog(blog) {
    let url = NWT_URL + "aj_taskrepost";
    const response = post_sync(url, blog.repostparam);
    if (response.code != 10000) {
        console.log("转发'%s'的微博，没有拿到道具", blog.user.name);
        return false;
    }

    console.log("转发'%s'的微博，拿到'%s'", response.data.propInfo.screen_name, response.data.propInfo.prop_name);
    return true;
}

console.log(`
  ____              _ _     _                       _ _
 |  _ \\  ___  _ __ ( ) |_  | |__   ___    _____   _(_) |
 | | | |/ _ \\| '_ \\|/| __| | '_ \\ / _ \\  / _ \\ \\ / / | |
 | |_| | (_) | | | | | |_  | |_) |  __/ |  __/\\ V /| | |_
 |____/ \\___/|_| |_|  \\__| |_.__/ \\___|  \\___| \\_/ |_|_(_) v0.16

为了测试红包飞，也是醉醉的
 `);

my_home().then(() => {
    let have_props = 0;
    Object.keys(map_props).forEach(id => {
        if (map_props[id] > 0) {
            have_props++;
        }
    });
    console.log("已搭建道具 %d 个, 一共有 %d 个", have_props, Object.keys(my_props).length);
    return true;
}).then(async () => {
    const users = await get_touch_users();
    return go_homes(users);
}).then(async () => {
    const blogs = await get_blogs(1);
    console.log("普通微博%d个待转发", blogs.length);
    return go_blogs(blogs);
}).then(async () => {
    const blogs = await get_blogs(2);
    console.log("限定微博%d个待转发", blogs.length);
    return go_blogs(blogs);
}).then(async () => {
    go_build_small();
    return true;
}).then(async () => {
    go_build_medium();
    return true;
}).then(async () => {
    go_build_large();
    return true;
});
