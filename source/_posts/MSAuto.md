---
title: MSAuto - 玩遊戲也要自動化
date: 2016-12-25 21:12:48
tags:
- trashtalk
---


最近 Facebook messanger 推出了一系列小遊戲，大部分其實都是無腦遊戲，但扯到互相比分總是會變得很激烈….

其中有個遊戲很特別 EverWing，他是可以升級主角的射擊遊戲，也就是我可以偷練再去挑戰別人，然後分數就會很高~
起初我偷練到七等左右去挑戰 David 老師，沒想到他一下就超越我了，後來又浪費我好幾個小時才超越他…。後來跑去挑戰 ball 他們，費盡千辛萬苦打到 3204 分，結果後來才發現他們都在直接發 request 作弊…。

<!--more-->

![有圖有真相，沒作弊打 3204 分](/img/2016-12-25/4.jpg)

既然他們都這樣玩，我也沒在客氣的，直接發個強一點的分數: 8萬分。

<div>![直接發 request 獲得八萬分](/img/2016-12-25/5.png)</div>

後來還發現 github 上竟然有自動練等的專案 [neverwing](https://github.com/ThePeiggy/neverwing) ，做得如此完整，真的是讓我開眼界了哈哈。

----------

以上是啟發我做個自動解 MSA 任務的程式的起因。

認識我的人應該都知道我一直有在玩一個手機遊戲 Metal Slug Attack (MSA)，基本上我會玩也只是因為這是小時候玩越南大戰機台的回憶。不過有鑒於這遊戲每日任務實在是有點麻煩又耗時，所以我就想弄成自動化。

首先還是要先知道這遊戲發 request 發到哪、怎麼發、順序是甚麼、怎麼認證使用者資訊。基本上這些想知道可能要架 Proxy + Postman + 手機 root 才行了。幸好有個好東西 [Charles](https://www.charlesproxy.com/) 可以輕易的架 Proxy 讓手機的 http request 都先通過電腦再到 remote server。

知道怎麼發之後，就來開始試試吧！MSA 這遊戲有很多模式，其中一個是 TREASURE HUNT，每隔幾個小時可以領一次獎品這樣(個人覺得很沒意義的模式…)，而我也是從這模式開始下手。

![TREASURE HUNT](/img/2016-12-25/1.png)


一般而言我頂多一天進一次遊戲，那像是這種 CD 3 小時的就很浪費(原本一天可以領 8 次的)，我寫的程式邏輯挺簡單的:


> 每十分鐘檢查一次，冷卻好了就領獎並且重新開始搜尋。

這用 nodejs [request](https://github.com/request/request) 加上 crontab 設定一下就可以達成~

~~這樣我每天都可以多好多體力 XD~~

接下來挑戰下個模式: COMBAT SCHOOL ，這就是每天可以打電腦三次然後會給你獎品(也是滿沒意義的模式…)

![COMBAT SCHOOL](/img/2016-12-25/2.png)

在做這模式的自動化時卡滿久的，有個 POST request 的 x-www-form-urlencoded data 長這樣:

```javascript
"cover=2&deck_no=3&stage_id=706&training_id=1" +
"&unit_ids[]=15&unit_ids[]=16&unit_ids[]=17&unit_ids[]=18&unit_ids[]=19&unit_ids[]=21&unit_ids[]=84&unit_ids[]=82&unit_ids[]=271&unit_ids[]=340" +
"&unit_level[]=50&unit_level[]=50&unit_level[]=50&unit_level[]=50&unit_level[]=50&unit_level[]=50&unit_level[]=50&unit_level[]=50&unit_level[]=50&unit_level[]=50"
```

可以發現有一大堆 key 都是一樣的( `unit_ids[]` , `unit_level[]` )，這用 nodejs [request](https://github.com/request/request) 似乎辦不到，所以我最後決定寫 shell script 直接用 curl 發 request ，再用 cronjob 設定每天幫刷一下關。
恩，就成功了。 

再挑戰下一個模式: P.O.W RESCUE ，每天可以打 20 關電腦，會給你一些獎品~~(怎麼每個模式都大同小異XD)~~。這是我覺得最浪費時間的模式了，因為一天要打 20 次。

![P.O.W RESCUE](/img/2016-12-25/3.png)


這邏輯稍微複雜一點，因為每次挑戰的 `stage_id` 都不一樣，要先 GET 下一關 `stage_id` ，而且又有那種 nodejs [request](https://github.com/request/request) 不能發的 request。解法兩種:


1. 全部用 shell script 寫。
2. 用 nodejs 寫，要發特殊 request 就另外執行 shell script。

基於我其實不太會寫 shell script，我決定採用 2 的混和寫法。利用 nodejs 判斷下一關 `stage_id` 再傳給 shell script 發 request。
在 nodejs 中要執行 shell 可以這樣:

```javascript
const cp = require('child_process');
const job = (str, option) => {
    return cp.execSync(str, { cwd: __dirname }).toString();
};
  
job('/bin/bash script.sh');
```

這模式我並沒有設定 cronjob，因為我有時候想自己玩 XD。

而其他模式我現階段沒打算自動化，不然就根本都不是我在玩了…


----------

寫這些東西其實也讓我學到一些新東西以及一些小技巧，這也算是玩 MSA 給我的收穫嗎？哈哈
其實我 code 寫得亂七八糟，但管他的可以用就好~

最後還是附上 code: [MSAuto](https://github.com/SSARCandy/MSAuto)

~~是說這應該算是作弊喔，抓到會被 ban 吧?~~
~~不過其實被 ban 也算是一種解脫吧?~~

