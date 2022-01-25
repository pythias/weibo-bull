# 每年红包飞的测试脚本

`DON'T BE EVIL`

## 2020年微博福牛摸一摸

1. 使用 chrome 打开 [微博](https://weibo.com) 并登录
2. 访问页面 [https://huodong.weibo.cn/hongbao2021](https://huodong.weibo.cn/hongbao2021)
3. 打开调试窗口，复制以下代码至console，执行既可

```js
fetch("https://raw.githubusercontent.com/pythias/weibo-bull/master/weibo-bull.js")
    .then(response => response.text())
    .then(text => {
        eval(text);
    });
```

## 2021年微博新鲜市

1. 使用 chrome 打开 [微博](https://weibo.com) 并登录
2. 访问页面 [https://huodong.weibo.cn/nwt2022/aj_index](https://huodong.weibo.cn/nwt2022/aj_index)
3. 打开调试窗口，复制以下代码至console，执行既可

```js
fetch("https://raw.githubusercontent.com/pythias/weibo-bull/master/weibo-nwt.js")
    .then(response => response.text())
    .then(text => {
        eval(text);
    });
```
