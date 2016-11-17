---
title: 用 Facebook 聊天機器人當通知系統
date: 2016-11-17 19:57:17
tags: 
- devOps
- nodejs
- unix
---

CMLab 有二十幾台 unix work stations 供大家使用(據說 CMLab 的工作站比資工系工作站還要好...)。
雖然這些機器設備都很強悍，但還是有時候會出現某台機器掛掉，或是 CPU, Memory, Swap 用量過高之類的事件。若有這類事發生就必須去處理，不然一直讓機器維持在高負載很容易就死掉了。
實驗室有個 [網站](https://www.cmlab.csie.ntu.edu.tw/status/) 可以查看機器及時狀態，什麼機器有什麼問題一看就知道，超方便的。

但是不上去看就不會知道有沒有狀況，所以我就決定做個有狀況發生就通知我的 Facebook chat bot。

<!-- more -->

## 爬網頁

最簡單的方式莫過於把網站的內容爬下來，如果有高負載或死機就通知我。
我用 nodejs [request](https://github.com/request/request) 來完成這件事。

```js
const request = require('request');
request('https://www.cmlab.csie.ntu.edu.tw/status/', function (error, response, body) {
  console.log(body) // Show the HTML
});
```

## facebook-chat-api

[facebook-chat-api](https://github.com/Schmavery/facebook-chat-api) 可以很容易的操作聊天室相關的行為，我利用這套件來達成通知自己機器有狀況了。
將爬下來的網頁內容，找出掛掉的機器，配合 [facebook-chat-api](https://github.com/Schmavery/facebook-chat-api) 就可以達成用 fb 通知有機器掛掉了。

```js
// require modules
 
let deadMachines = [];
request('http://www.cmlab.csie.ntu.edu.tw/status/', function (err, res, body) {
    const $ = cheerio.load(body);
    const dead = $('.dead');
 
    for (let i = 0; i < dead.length; i++) {
        const machineId = dead.eq(i).text();
        deadMachines.push(machineId);
    }
 
    // all machines are fine~
    if (!deadMachines.length) return;
 
    // login to facebook and send msg to unix manager
    loginFacebook(config.account, function (err, api) {
        if (err) return console.error(err);
 
        api.sendMessage(`${deadMachines.toString()} is dead.`, /* channel_id */, function (err) {
            console.log(`${deadMachines.toString()} is dead.`);
        });
    });
});
```

{% fancybox /img/2016-11-17/1.png 透過 Facebook 聊天室告知我有機器掛掉了。 %}

## 定時檢查

這隻程式並不是個持續監控的程式，只能算是個 script 而已。所以我用 `crontab` 設定排程定時幫我檢查機器是不是有狀況。
利用 unix 指令 `crontab -e` 編輯排程。

```sh
# 每小時執行程式
0 * * * * node index.js
```

crontab 是吃 localtime，系統現在是甚麼時間可以藉由 `timedatectl` 查看:

```sh
$ timedatectl
      Local time: Thu 2016-11-17 22:15:13 CST
  Universal time: Thu 2016-11-17 14:15:13 UTC
        RTC time: n/a
       Time zone: Asia/Taipei (CST, +0800)
 Network time on: yes
NTP synchronized: yes
 RTC in local TZ: no
```

另外，如果設定了新的 Time Zone，則必須重啟 crontab service 才會讓他吃到正確的時間。

```sh
$ /etc/init.d/cron restart
```

## 截圖

直到現在其實已經達成目標了，但是只講句「某某機器掛了。」似乎還是差強人意，為了防範未然，應該要把高負載的機器也告知一下，提早處理以免機器死掉。
想想感覺把整個網站截圖下來傳給我不是最快嗎。
恩，那就這樣弄吧！

多虧廣大 nodejs 套件開發者，這件事可以很容易地利用 [webshot](https://github.com/brenden/node-webshot) 達成。

{% fancybox /img/2016-11-17/2.png 截下整個表格傳給我。 %}

## Callback to Promise

爬網頁、截圖、傳訊息都是非同步的動作，寫起來就變成 Callback Hell 了。
真的是醜爆了...

```js
// Scrap web
request('url', function (err, res, body) {
    /* do something with 'body' */
    // Screenshot
    webshot(body, 'tmp.png', options, function (err) {
        // login to facebook and send msg
        loginFacebook(config.account, function (err, api) {
            // send message
        });
    });
});
```

利用 [bluebird](http://bluebirdjs.com/docs/getting-started.html)，可以把 Callback 神奇的轉為 Promise，
並且用 es6 的語法改寫，就可以大幅改善程式碼的易讀性～

```js
request('url')
    .then(body => {
        /* do something with 'body' */
        // Screenshot
        return webshot(body, 'tmp.png', options);
    })
    .then(() => loginFacebook(config.account)) // login to facebook and send msg
    .then(api => {
        // send message
    })
    .catch(err => console.error(err));
```

完整的程式碼: [https://github.com/SSARCandy/cml-status-fb-notify](https://github.com/SSARCandy/cml-status-fb-notify)
