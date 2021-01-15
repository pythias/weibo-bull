// 1. 使用 chrome 打开 https://huodong.weibo.cn/hongbao2021 （确保你登录了微博）
// 2. 打开调试窗口，在 console 中贴下面的代码后回车

let my_props = {}, homes_to_visit = [], stop = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function post_sync(url, data, callback) {
    let http = new XMLHttpRequest();
    http.open('POST', url, false);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
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
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: data
    });
    return response.json().then(json => {
        if (json.code == 10000 && json.data !== undefined) {
            return json.data;
        }

        console.log(json);
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

function get_ranks(type, page) {
    let url = 'https://huodong.weibo.cn/hongbao2021/aj_getrank?t=' + type + '&page=' + page;
    return post_sync(url, '', (data) => {
        console.log('get_ranks, type:%d, page:%d, count:%d, has_next:%s', type, page, data.rank.length, data.hasnext);
        data.rank.forEach((rank, i) => {
            homes_to_visit.push(user_from_rank(rank));
        });

        return data.hasnext && page < 5;
    });
}

function get_plaza(page) {
    let url = 'https://huodong.weibo.cn/hongbao2021/aj_propnews?page=' + page;
    return post_sync(url, '', (data) => {
        console.log('get_plaza, page:%d, count:%d, has_next:%s', page, data.list.length, data.hasnext);
        data.list.forEach((user_prop, i) => {
            if (my_props[user_prop.propId] === undefined) {
                homes_to_visit.push(user_from_plaza(user_prop));
            }
        });

        return data.hasnext && page < 5;
    });
}

function get_map(type) {
    let url = 'https://huodong.weibo.cn/hongbao2021/aj_travelmap?type=' + type;
    return post_sync(url, '', (data) => {
        let length = 0;
        if (data.bottomData !== undefined) {
            length = data.bottomData.length;
            data.bottomData.forEach((user, i) => {
                if (user.udata === undefined) {
                    return;
                }

                homes_to_visit.push(user_from_map(user));
            });
        }

        console.log('get_map, type:%d, count:%d', type, length);
        return type < 3;
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

        if (location < 8) {
            get_props(location + 1);
        }
    });
}

function get_home(user) {
    if (stop) {
        return;
    }

    let url = "https://huodong.weibo.cn/hongbao2021/aj_bullhome?bullid=" + user.bull_id + "&debug=false&uid=" + user.id;
    post(url).then(data => {
        go_touch(user, data);
    });
}

function go_touch(user, data) {
    let user_name = ""
    if (user.name) {
        user_name = user.name;
    } else {
        user_name = data.currentUid.id;
    }

    if (data.canTouchMore === 0) {
        console.log("%s 的牛 %s 不在", user_name, data.userBull.bull_name);
        return;
    }

    let url = "https://huodong.weibo.cn/hongbao2021/aj_touch";
    let query = new URLSearchParams();
    query.append('touchnum', 50);
    query.append('touchbullid', user.bull_id);
    query.append('touchuid', user.id);
    query.append('pagetoken', data.pagetoken);
    post(url, query.toString()).then(data => {
        if (data.layer) {
            console.log("摸到 %s 的 %s", user_name, data.layer.propGotLayer.desc);
            mblog_after(data.layer.propGotLayer.aj_pdata, user);
        } else if(data.touchTips && data.touchTips.length > 0) {
            console.log("摸过 %s 了", user_name);
            if (data.touchTips[0].text.indexOf("摸一摸道具数已达上限") > 0) {
                stop_all();
                console.log("今天不能再摸了");
            }
        } else {
            console.log("白摸 %s 了", user_name);
        }
    });
}

function go_sign() {
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
}

function go_travel(scene) {
    let url = 'https://huodong.weibo.cn/hongbao2021/aj_scene?sceneid=' + scene;
    post_sync(url, '', (data) => {
        scene_name = data.name;
        if (data.props === undefined) {
            console.log('在 %s 没寻到宝', scene_name);
        } else {
            post('https://huodong.weibo.cn' + data.props.btn.link).then(data => {
                console.log('在 %s 寻到 %s', scene_name, data.name);
            });
        }

        if (scene < 17) {
            setTimeout(() => {
                go_travel(scene + 1);
            }, 2000 * scene);
        }
    });
}

function mblog_after(sign, user) {
    let url = "https://huodong.weibo.cn/hongbao2021/aj_mblogfollow";
    let query = new URLSearchParams();
    query.append('sign', sign);
    query.append('mblog', 1);
    query.append('follow', 1);
    post(url, query.toString()).then(data => {
        console.log("发微博感谢了 %s", user.name);
    });
}

function stop_all() {
    stop = true;
}

async function start() {
    var page = 1, type = 0;
    while (true) {
        await sleep(1000);
        if (!get_ranks(0, page++)) {
            break;
        }
    }

    page = 1;
    while (true) {
        await sleep(1000);
        if (!get_ranks(1, page++)) {
            break;
        }
    }

    page = 1;
    while (true) {
        await sleep(1000);
        if (!get_plaza(page++)) {
            break;
        }
    }

    while (true) {
        await sleep(1000);
        if (!get_map(type++)) {
            break;
        }
    }

    return homes_to_visit;
}

if (window.location.href.indexOf("https://huodong.weibo.cn/hongbao2021") === -1) {
    if (confirm("请访问福牛首页后再次粘贴脚本")) {
        window.location = "https://huodong.weibo.cn/hongbao2021";
    }
} else {
    go_sign();

    get_props(1);
    console.log("已有道具 %d 个", Object.keys(my_props).length);

    start().then((homes) => {
        homes.sort(() => Math.random() - 0.5);
        homes.forEach((home, i) => {
            setTimeout(() => {
                get_home(home)
            }, 1000 * i);
        });
    });

    go_travel(1);
}
