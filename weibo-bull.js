// 1. 使用 chrome 打开 https://huodong.weibo.cn/hongbao2021 （确保你登录了微博）
// 2. 打开调试窗口，在 console 中贴下面的代码后回车

let type = 0;
let page = 1;
let stop = false;
let timer = undefined;

function call(url, data, callback) {
    let http = new XMLHttpRequest();
    http.open('POST', url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    http.send(data);
    http.onreadystatechange = function() {
        if (http.readyState !== 4 || http.status !== 200) {
            return;
        }

        let json = {};
        try {
            json = JSON.parse(http.responseText);
        } catch (error) {
            return;
        }

        if (json.code === 10000) {
            if (callback) {
                callback(json.data);
            }
        } else {
            stop = true;
            clearTimeout(timer);
            console.log('手残了, 请就医');
            console.table(json);
        }
    }
}

function get_ranks() {
    let url = 'https://huodong.weibo.cn/hongbao2021/aj_getrank?t=' + type + '&page=' + page;
    call(url, '', function (data) {
        console.log('get_ranks, type:%d, page:%d, count:%d, has_next:%s', type, page, data.rank.length, data.hasnext);
        data.rank.forEach((rank, i) => {
            setTimeout(() => {
                get_home(rank);
            }, i * 2000);
        });

        if (data.hasnext) {
            page++;
            timer = setTimeout(() => {
                get_ranks();
            }, data.rank.length * 2000);
        }
    });
}

function get_home(rank) {
    if (stop) {
        return;
    }

    let url = "https://huodong.weibo.cn/hongbao2021/aj_bullhome?bullid=" + rank.bullid + "&debug=false&uid=" + rank.uid;
    call(url, {}, function (data) {
        get_touch(rank, data.pagetoken);
    });
}

function get_touch(rank, token) {
    if (stop) {
        return;
    }

    let url = "https://huodong.weibo.cn/hongbao2021/aj_touch";
    let query = new URLSearchParams();
    query.append('touchnum', 50);
    query.append('touchbullid', rank.bullid);
    query.append('touchuid', rank.uid);
    query.append('pagetoken', token);
    query.toString();
    call(url, query.toString(), function (data) {
        if (data.layer) {
            console.log("摸到 %s 的 %s", rank.username, data.layer.propGotLayer.desc);
        } else if(data.touchTips && data.touchTips.length > 0) {
            console.log("摸过 %s 了, 提示: '%s'", rank.username, data.touchTips[0].text);
            if (data.touchTips[0].text.indexOf("摸一摸道具数已达上限") > 0) {
                stop = true;
                clearTimeout(timer);
                console.log("今天不能再摸了");
            }
        } else {
            console.log("白摸 %s 了", rank.username);
        }
    });
}

if (window.location.href.indexOf("https://huodong.weibo.cn/hongbao2021") === -1) {
    if (confirm("请访问福牛首页后再次粘贴脚本")) {
        window.location = "https://huodong.weibo.cn/hongbao2021";
    }
} else {
    console.log("开始摸一摸...");
    get_ranks();
}
