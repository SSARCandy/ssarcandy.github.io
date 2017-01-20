---
title: 自動分享每日天文圖(APOD)到 Dcard
date: 2016-07-27 00:16:45
tags:
- trashtalk
- automation
---

原本其實只是要做個 [Slack bot](https://api.slack.com/bot-users)，
因為我懶得每天都上 [APOD](http://www.phys.ncku.edu.tw/~astrolab/mirrors/apod/archivepix.html) 官網看...
乾脆做個 bot 每天都會在中午 12:30 發今日的圖跟說明到 Slack channel 裡～
<!-- more -->
{% zoom /img/2016-07-27/1.PNG 自動發文到 slack channel 裡，然後還隨機搭配內容農場風格的一句話。 %}

不過除了我自己以外好像都沒什麼人捧場，幾乎都被無視 QQ
_David老師_ 還表示很煩要我關掉 (明明一天才 Po 一次啊啊啊 ಠ_ಠ

所以我只好忍痛取消這個 Slack bot，改成直接用 Direct message 傳給 _David老師_ XD

結果 _David老師_ 也做了個每半小時就發名言佳句給我的 bot，
害我只好也把我的 bot 改成每十分鐘隨機發天文圖給他，看誰比較耐得住煩～
{% zoom /img/2016-07-27/2.PNG 每半小時發給我一句名言佳句，真是世界煩。%}

當然這種互相毀滅的 bot 大戰持續沒多久就在雙方讓步之下都停止了.....

--- 以上都是前言 ---

即使 Slack 上都沒人要鳥我，
我還是秉持著推廣基礎天文教育的偉大理念，認為優質的每日天文圖的不應該被埋沒，要讓這樣優質的內容給更多人接觸到！
最後突然想到：「不然乾脆發在 Dcard 廢版好了，那邊最多人在看了而且不受版規限制」
可是懶人如我是不可能每天上去 Po 文的，所以又寫了個 bot 每天中午戳 Dcard API，發優質天文圖到廢版(廢文？
{% zoom /img/2016-07-27/3.PNG 發廢文到廢版 %}

結果意外反應還不錯？
還有人想要我整理系列文，不愧是廢版版友，就是有眼光！
{% zoom /img/2016-07-27/4.PNG 大家都很捧場，覺得溫馨 ╰(〞︶〝) ╯ %}

~~不知道要過多久才會有人會發現這都是 bot 在發文 XDD~~

--
最後自己推銷一下，由於 APOD 只有 NASA 有提供官方 [API](https://api.nasa.gov/)，除了英文以外其他語言的子站(像是中文版)都沒辦法簡單的取得內容，所以我寫了一個 npm 套件，專門處理取得指定日期、指定語言的 APOD 內容。
Github: [https://github.com/SSARCandy/node-apod](https://github.com/SSARCandy/node-apod)
Demo: [http://ssarcandy.tw/node-apod/demo.html](http://ssarcandy.tw/node-apod/demo.html)
