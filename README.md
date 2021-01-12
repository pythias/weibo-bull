# weibo-bull
微博福牛摸一摸

## 使用方法

1. 使用 chrome 打开 [微博](https://weibo.com) 并登录
2. 访问页面 [https://huodong.weibo.cn/hongbao2021](https://huodong.weibo.cn/hongbao2021)
2. 打开调试窗口，复制以下代码至console，执行既可

```js
fetch("https://raw.githubusercontent.com/pythias/weibo-bull/master/weibo-bull.js")
    .then(response => response.text())
    .then(text => {
        eval(text);
        const cleaner = new cleanup();
        cleaner.start();
    });
```
