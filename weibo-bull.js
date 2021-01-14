// 1. 使用 chrome 打开 https://huodong.weibo.cn/hongbao2021 （确保你登录了微博）
// 2. 打开调试窗口，在 console 中贴下面的代码后回车

let type = 0;
let page = 1;
let stop = false;
let rank_timer = undefined;
let plaza_timer = undefined;
let my_props = {};

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

        if (json.code == 10201) {
            return {};
        }

        stop_all();
        console.log('手残了, 请就医');
        console.table(json);
        return {};
    });
}

function get_ranks() {
    let url = 'https://huodong.weibo.cn/hongbao2021/aj_getrank?t=' + type + '&page=' + page;
    post(url).then(data => {
        console.log('get_ranks, type:%d, page:%d, count:%d, has_next:%s', type, page, data.rank.length, data.hasnext);
        data.rank.forEach((rank, i) => {
            setTimeout(() => {
                get_home(rank);
            }, i * 2000);
        });

        if (data.hasnext) {
            page++;
            rank_timer = setTimeout(() => {
                get_ranks();
            }, data.rank.length * 2000);
        }
    });
}

function get_plaza() {
    let url = 'https://huodong.weibo.cn/hongbao2021/aj_propnews?page=' + page;
    post(url).then(data => {
        console.log('get_plaza, page:%d, count:%d, has_next:%s', type, page, data.list.length, data.hasnext);
        data.list.forEach((user_prop, i) => {
            if (my_props[user_prop.propId] === undefined) {
                setTimeout(() => {
                    get_home(user_prop);
                }, i * 2000);
            }
        });

        if (data.hasnext) {
            page++;
            plaza_timer = setTimeout(() => {
                get_plaza();
            }, data.list.length * 2000);
        }
    });
}

function get_user_props(uid) {
    for (let index = 1; index <= 8; index++) {
        get_props(uid, index);
    }
}

function get_props(uid, location) {
    let url = "https://huodong.weibo.cn/hongbao2021/aj_proplist?location=" + location + "&bull_uid=" + uid;
    post(url).then(data => {
        if (data.props === undefined || data.props.length === 0) {
            return;
        }
        
        data.props.forEach(prop => {
            my_props[prop.propid] = prop.title;
        });
    });
}

function get_home(rank) {
    if (stop) {
        return;
    }

    let url = "https://huodong.weibo.cn/hongbao2021/aj_bullhome?bullid=" + rank.bullid + "&debug=false&uid=" + rank.uid;
    post(url).then(data => {
        get_touch(rank, data);
    });
}

function get_touch(rank, data) {
    if (stop) {
        return;
    }

    let username = ""
    if (rank.username) {
        username = rank.username;
    } else {
        username = data.currentUid.id;
    }

    if (data.canTouchMore === 0) {
        console.log("%s 的牛 %s 不在", username, data.userBull.bull_name);
        return;
    }

    let url = "https://huodong.weibo.cn/hongbao2021/aj_touch";
    let query = new URLSearchParams();
    query.append('touchnum', 50);
    query.append('touchbullid', rank.bullid);
    query.append('touchuid', rank.uid);
    query.append('pagetoken', data.pagetoken);
    post(url, query.toString()).then(data => {
        if (data.layer) {
            console.log("摸到 %s 的 %s", username, data.layer.propGotLayer.desc);
            // my_props[data.layer.propGotLayer.propid] = data.layer.propGotLayer.desc;
            mblog_after(data.layer.propGotLayer.aj_pdata, rank);
        } else if(data.touchTips && data.touchTips.length > 0) {
            console.log("摸过 %s 了", username);
            if (data.touchTips[0].text.indexOf("摸一摸道具数已达上限") > 0) {
                stop_all();
                console.log("今天不能再摸了");
            }
        } else {
            console.log("白摸 %s 了", username);
        }
    });
}

function get_map(type) {
    let url = 'https://huodong.weibo.cn/hongbao2021/aj_travelmap?type=' + type;
    post(url).then(data => {
        let length = 0;
        if (data.bottomData !== undefined) {
            length = data.bottomData.length;
            data.bottomData.forEach((user, i) => {
                setTimeout(() => {
                    get_home(user);
                }, i * 2000);
            });
        }

        console.log('get_map, type:%d, count:%d', type, length);
        type++;
        if (type < 4) {
            setTimeout(() => {
                get_map(type);
            }, length * 2000);
        }
    });
}

function stop_all() {
    stop = true;
    clearTimeout(rank_timer);
    clearTimeout(plaza_timer);
}

function mblog_after(sign, rank) {
    let url = "https://huodong.weibo.cn/hongbao2021/aj_mblogfollow";
    let query = new URLSearchParams();
    query.append('sign', sign);
    query.append('mblog', 1);
    query.append('follow', 1);
    post(url, query.toString()).then(data => {
        console.log("发微博感谢了 %s", rank.username);
    });
}

if (window.location.href.indexOf("https://huodong.weibo.cn/hongbao2021") === -1) {
    if (confirm("请访问福牛首页后再次粘贴脚本")) {
        window.location = "https://huodong.weibo.cn/hongbao2021";
    }
} else {
    //get_user_props(0);

    console.log("开始摸榜单...");
    get_ranks();

    // console.log("开始摸广场...");
    // get_plaza();

    console.log("开始摸地图...");
    get_map(0);
}
