// 1. 使用 chrome 打开 https://huodong.weibo.cn/hongbao2021 （确保你登录了微博）
// 2. 打开调试窗口，在 console 中贴下面的代码后回车

let my_props = {}, stopped = false, rank_homes = [], map_homes = [];

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

function user_from_rank(rank) {
    return {
        id: rank.uid,
        name: rank.username,
        bull_id: rank.bullid,
        bull_name: undefined
    };
}

function user_from_plaza(plaza) {
    return {
        id: plaza.uid,
        name: plaza.userName,
        bull_id: plaza.bullId,
        bull_name: undefined
    };
}

function user_from_map(map) {
    return {
        id: map.udata.id,
        name: map.udata.name,
        bull_id: map.bullid,
        bull_name: undefined
    };
}

function get_ranks(type, page, homes) {
    let url = 'https://huodong.weibo.cn/hongbao2021/aj_getrank?t=' + type + '&page=' + page;
    return post_sync(url, '', (data) => {
        console.log('get_ranks, type:%d, page:%d, count:%d, has_next:%s', type, page, data.rank.length, data.hasnext);
        data.rank.forEach((rank, i) => {
            homes.push(user_from_rank(rank));
        });

        return data.hasnext;
    });
}

function get_plaza(page, homes) {
    let url = 'https://huodong.weibo.cn/hongbao2021/aj_propnews?page=' + page;
    return post_sync(url, '', (data) => {
        console.log('get_plaza, page:%d, count:%d, has_next:%s', page, data.list.length, data.hasnext);
        data.list.forEach((user_prop, i) => {
            if (my_props[user_prop.propId] === undefined) {
                homes.push(user_from_plaza(user_prop));
            }
        });

        return data.hasnext;
    });
}

function get_map(type, homes) {
    let url = 'https://huodong.weibo.cn/hongbao2021/aj_travelmap?type=' + type;
    post(url, '').then((data) => {
        let length = 0;
        if (data.bottomData !== undefined) {
            length = data.bottomData.length;
            data.bottomData.forEach((user, i) => {
                if (user.udata === undefined) {
                    return;
                }

                homes.push(user_from_map(user));
            });
        }

        console.log('get_map, type:%d, count:%d', type, length);
    });
}

function get_props(location) {
    let url = "https://huodong.weibo.cn/hongbao2021/aj_proplist?bull_uid=0&location=" + location;
    post_sync(url, '', (data) => {
        if (data.props === undefined || data.props.length === 0) {
            return;
        }

        console.log("收拾行李箱 %d, 共 %d 道具", location, data.props.length);
        data.props.forEach(prop => {
            my_props[prop.propid] = prop.title;
        });
    });
}

function go_home(user) {
    let url = "https://huodong.weibo.cn/hongbao2021/aj_bullhome?bullid=" + user.bull_id + "&debug=false&uid=" + user.id;
    post(url).then(home_data => {
        go_touch(user, home_data);
    });
}

function go_touch(user, home_data) {
    let user_name = ""
    if (user.name) {
        user_name = user.name;
    } else {
        user_name = home_data.currentUid.id;
    }

    if (home_data.canTouchMore === 0) {
        console.log("%s 的牛 %s 不在", user_name, home_data.userBull.bull_name);
        return;
    }

    if (home_data.userBull.curPropids !== undefined && home_data.userBull.curPropids.length > 0) {
        const missing = (pid) => my_props[pid] === undefined;
        const f = home_data.userBull.curPropids.findIndex(missing);
        if (f === -1) {
            console.log("%s 的福牛道具都有了, 道具：%s", user_name, home_data.userBull.curPropids.join());
            return;
        }
    } else {
        console.log("%s 的福牛没有道具可以摸", user_name);
        return;
    }

    let url = "https://huodong.weibo.cn/hongbao2021/aj_touch";
    let query = new URLSearchParams();
    query.append('touchnum', 8);
    query.append('touchbullid', user.bull_id);
    query.append('touchuid', user.id);
    query.append('pagetoken', home_data.pagetoken);
    post(url, query.toString()).then((touch_data) => {
        if (touch_data.layer) {
            console.log("摸到 %s 的 %s", user_name, touch_data.layer.propGotLayer.desc);
            mblog_after(touch_data.layer.propGotLayer.aj_pdata, user);
        } else if(touch_data.touchTips && touch_data.touchTips.length > 0) {
            if (touch_data.touchTips[0].text.indexOf("摸一摸道具数已达上限") > 0) {
                stopped = true;
            }
            console.log("摸过 %s 了, %s", user_name, touch_data.touchTips[0].text);
        } else {
            console.log("白摸 %s 了", user_name);
        }

        // if (touch_data.canTouchMore) {
        //     setTimeout(() => {
        //         go_touch(user, home_data);
        //     }, 300);
        // }
    });
}

async function go_sign() {
    let url = 'https://huodong.weibo.cn/hongbao2021/aj_sign';

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

function go_task(if_route, if_url, callback) {
    let url = 'https://huodong.weibo.cn/hongbao2021/aj_taskinfo';
    return post_sync(url, '', (data) => {
        if (data.length == 0) {
            return;
        }

        for (let index = 0; index < data.length; index++) {
            const task = data[index];
            const task_info = task.to_url.split("?");
            const task_route = task_info[0];
            const task_url = task_info[1];
            
            if (if_route !== task_route && if_url !== task_url) {
                continue;
            }

            if (task.left_nums == 0) {
                console.log("已经完成%d个'%s'", task.have_nums, task.task_name);
                return true;
            }

            callback(task_route, task_url);
        }
    });
}

function task_fashion(route, url) {
    const page = (Math.random() * 20).toFixed(0);
    const fashion_url = 'https://api.weibo.cn/2/cardlist?wm=3333_2001&launchid=10000365--x&b=0&from=10B1193010&c=iphone&networktype=wifi&v_p=87&skin=default&v_f=1&s=64444444&lang=zh_CN&sflag=1&ua=iPhone10,3__weibo__11.1.1__iphone__os14.2&ft=11&fid=232318&moduleID=pagecard&containerid=232318&count=20&page=' + page;
    go_fashion(fashion_url);
}

function go_fashion(fashion_url) {
    post_sync(fashion_url, '', (data) => {
        for (let index = 0; index < data.cards.length; index++) {
            const card = data.cards[index];
            if (card.card_type !== 22) {
                continue;
            }

            const scheme = card.scheme;
            const scheme_query = scheme.split("?")[1];
            const home_url = 'https://huodong.weibo.cn/hongbao2021/aj_bullhome?' + scheme_query;
            post(home_url, '').then((data) => {
                console.log("找到一个福牛图标");
            });
        }
    });
}

function task_scene(route, url) {
    const scene_url = 'https://huodong.weibo.cn/hongbao2021/aj_scene?' + url;
    go_scene(scene_url);
}

function go_scene(scene_url) {
    post(scene_url, '').then((data) => {
        scene_name = data.name;
        if (scene_name === undefined) {
            console.log('没有此地图 %s', scene);
        } else if (data.props === undefined) {
            console.log('在 %s 没寻到宝', scene_name);
        } else {
            prop_title = data.props.title;
            post('https://huodong.weibo.cn' + data.props.btn.link).then(data => {
                if (data) {
                    console.log('在 %s 寻到 %s', scene_name, prop_title);
                } else {
                    console.log('在 %s 已经获得过 %s', scene_name, prop_title);
                }
            });
        }
    });
}

function mblog_after(sign, user) {
    let url = "https://huodong.weibo.cn/hongbao2021/aj_mblogfollow";
    let query = new URLSearchParams();
    query.append('sign', sign);
    query.append('mblog', 1);
    query.append('follow', 1);
    post(url, query.toString()).then((data) => {
        console.log("发微博感谢了 %s", user.name);
    });
}

function random_pages(size, max) {
    var pages = [];
    for (let index = 1; index <= max; index++) {
        pages.push(index);
    }

    return pages.sort(() => Math.random() - 0.5).slice(0, size);
}

async function go_homes(homes) {
    stopped = false;
    homes = homes.sort(() => Math.random() - 0.5).slice(0, 100);
    for (var i = 0; i < homes.length && stopped != true; i++) {
        await sleep(1000);
        go_home(homes[i]);
    }

    return true;
}

async function start_rank() {
    var homes = [];
    var pages = random_pages(10, 400);
    for (const i in pages) {
        const page = pages[i];
        await sleep(1000);
        if (!get_ranks(0, page, homes)) {
            break;
        }
    }

    return homes;
}

async function start_friends() {
    var homes = [];
    var pages = random_pages(5, 10);
    for (const i in pages) {
        const page = pages[i];
        await sleep(1000);
        if (!get_ranks(1, page, homes)) {
            break;
        }
    }

    return homes;
}

async function start_plaza() {
    var homes = [];
    var pages = random_pages(10, 20);
    for (const i in pages) {
        const page = pages[i];
        await sleep(1000);
        if (!get_plaza(page, homes)) {
            break;
        }
    }

    return homes;
}

async function start_map() {
    var homes = [];
    for (var i = 0; i < 4; i++) {
        await sleep(1000);
        get_map(i, homes);
    }
    
    return homes;
}

async function start_scenes() {
    for (var i = 0; i < 20; i++) {
        await sleep(1000);
        const result = go_task('pages/place/place', '', (task) => {
            task_scene(task);
        });

        if (result) {
            break;
        }
    }

    return true;
}

async function start_fashion() {
    for (var i = 0; i < 20; i++) {
        await sleep(1000);
        const result = go_task('', 'containerid=232318', (task) => {
            task_fashion(task);
        });

        if (result) {
            break;
        }
    }

    return true;
}

console.log(`
  ____              _ _     _                       _ _
 |  _ \\  ___  _ __ ( ) |_  | |__   ___    _____   _(_) |
 | | | |/ _ \\| '_ \\|/| __| | '_ \\ / _ \\  / _ \\ \\ / / | |
 | |_| | (_) | | | | | |_  | |_) |  __/ |  __/\\ V /| | |_
 |____/ \\___/|_| |_|  \\__| |_.__/ \\___|  \\___| \\_/ |_|_(_) v0.10
`);

go_sign()
    .then(() => {
        for (var i = 1; i < 9; i++) {
            get_props(i);
        }
        console.log("已有道具 %d 个", Object.keys(my_props).length);
    })
    .then(async () => {
        const homes = await start_rank();
        return go_homes(homes);
    })
    .then(async () => {
        const homes = await start_friends();
        return go_homes(homes);
    })
    .then(async () => {
        const homes = await start_map();
        return go_homes(homes);
    })
    .then(() => {
        return start_scenes();
    });

// start_fashion();
