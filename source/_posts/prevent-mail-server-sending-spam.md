---
title: 防止 mail server 大量寄信的手段
date: 2017-02-26 21:14:07
tags:
- unix
- note
image: /img/2017-02-26/01.png
---

最近這幾周都一直被 cmlab 的 mail server 霸凌，覺得難過...
為了解決 mail server 時不時會大量寄出信件的問題，嘗試了許多方法，終於得到一點點平靜...
本篇整理了我們最近嘗試的方法及一些工具，做個紀錄...

<!-- more -->

# 流量分析及監控

先介紹兩個好工具，

- `pflogsumm`
- `mailgraph`

方便監控以及分析 mail server 的狀況:

## pflogsumm

`pflogsumm` 是個可以把 mail.log 整理成一份比較好閱讀的報告，可以一目瞭然這時段內共收發多少信、誰寄最多信、誰收最多信等等的資訊。
用法也很簡單:

```bash
$ apt-get install pflogsumm  # install
$ pflogsumm /var/log/mail.log -d today # generate today's report
 
Postfix log summaries for Feb 26
 
Grand Totals
------------
messages
      659   received
     1047   delivered
      135   forwarded
        0   deferred
        2   bounced
     3285   rejected (75%)
        0   reject warnings
        0   held
        0   discarded (0%)
  
    15378k  bytes received
    20065k  bytes delivered
      142   senders
       88   sending hosts/domains
      156   recipients
       15   recipient hosts/domains
```

這邊只列出 report 的一部份，還有很多有用的資訊，可以自己試試看。



## mailgraph

這是一個視覺化圖表呈現 mail server 狀態的工具，顯示整個時間軸收發了多少信之類的資訊，介面大概長這樣:

{% zoom /img/2017-02-26/01.png mailgrapgh 網頁統計資訊 %}

這是以網頁來呈現的，原理就是每幾分鐘就會去整理 mail.log 中的資訊，然後產生圖表再呈現在網頁上。
安裝流程如下:

```bash
$ apt-get install rrdtool mailgraph
$ dpkg-reconfigure mailgraph
```

然後會問你三個問題

- Should Mailgraph start on boot? <-- **Yes**
- Logfile used by mailgraph: <-- `/var/log/mail.log`
- Count incoming mail as outgoing mail? 這要看你是否有安裝一些過濾器 (amavisd 之類的)，有的話就選 **NO**，反之則選 **YES**

再來就是把對應檔案搬到 web server 下面

```bash
$ mkdir /var/www/mailgrapgh # create a folder for mailgraph
$ cp -p /usr/lib/cgi-bin/mailgraph.cgi /var/www/mailgraph 
$ cp -p /usr/lib/cgi-bin/mailgraph.css /var/www/mailgraph 
```

然後就可以連上 `http://yorurdomain.com/mailgraph/mailgraph.cgi` 查看結果。


# 看 mail.log 揪出亂寄者

通常 mail server 寄信量暴增都是因為有使用者在大量寄信，無論是真人在搞鬼或是有程式在惡意寄信，都應該視情況直接封鎖他寄信的功能。


## 找 `nrcpt` 過高者

```bash
$ cat mail.log | egrep 'nrcpt=[1-9][0-9]' 
```

nrcpt 是 number of recipients 的縮寫，nrcpt 很大表示這封信要寄給很多人，合不合理還是要看情況，但至少由此下手比較能夠找到搞鬼的人。

## 看 `pflogsumm` 誰寄太多信

```bash
$ pflogsumm /var/log/mail.log -d today
 
Senders by message count
------------------------
    1060   xxx@cmlab.csie.ntu.edu.tw
      32   xxx@cmlab.csie.ntu.edu.tw
      12   xxx@cmlab.csie.ntu.edu.tw
       6   xxx@cml0.csie.ntu.edu.tw
       2   xxx@cmlab.csie.ntu.edu.tw
       2   xxx@ntu.edu.tw
```

找到誰很詭異寄很多信之後，就加入 Postfix 的 sender 黑名單中限制寄信。(記得更新 .db 檔)

在 Postfix `main.cf` 中加入 `sender-access` 的黑名單:

```
smtpd_sender_restrictions = 
    check_sender_access hash:/etc/postfix/sender-access,
    ...
```

```bash
$ vim sender-access
 
# add this line to disable sender function
# xxx@cmlab.csie.ntu.edu.tw REJECT sorry, we don't provide smtp service for you.
 
$ postmap sender-access # update .db file
```

# 設定內收外寄流量控制

有時候單靠黑名單其實有點治標不治本，因為今天鎖了 A 明天可能是 B 在大量寄信，所以若能設定每個使用者一小時允許的寄信量才可以防止這類大量寄信的事情發生。

Postfix 並沒有相關的設定可以設，必須依靠別的程式，而看起來最好的就是 Policyd 了
我之前已經有一篇是在講[如何安裝及設定 Policyd](https://ssarcandy.tw/2016/12/24/policyd/) 了，可以直接參考那篇。

不過有幾點是需要注意的，我一開始設定是設定成**「若超過寄信額度，則延後寄信(DEFER)」**，我之所以這樣設是不想讓使用者的信沒寄出去，只是讓他晚一點寄出去。但這樣就又可能造成某人大量寄信結果因為超過額度所以全部都塞在 mail queue 中….崩潰….

所以我現在就直接設成**「若超過寄信額度，則直接拒絕寄信(REJECT)」**，這樣比較乾脆～


# 設定重送間隔、生命週期

有時候信件會寄不出去(可能是對方容量滿了、網路問題等等、或是對方伺服器黑名單我們的信)，Postfix 預設是有重送機制的，但假設信件一直重送而且又一直寄不出去那 mail queue 就會累積越來越多信，最後就會有超大寄信流量，而這時候就會被學校限制 IP 了。

Postfix 重送的相關設定預設值都相當長，像是一封信他能夠存活在 mail queue 中的時間竟然是五天，這也表示如果有一封信寄不出去的話 Postfix 會鍥而不捨的連試五天…..

以下列出 Postfix 有關於重送的設定及其預設值，想看每個的詳細說明可以看[官方文件](http://www.postfix.org/postconf.5.html)

```
minimal_backoff_time (default: 300s)
maximal_backoff_time (default: 4000s)
queue_run_delay (default: 300s)
maximal_queue_lifetime (default: 5d)
bounce_queue_lifetime (default: 5d)
```

根據我們自己 mail server 的用量，我最後將設定改為如下，這樣應該就可以避免 queue 中塞滿寄不出去的信的狀況了。

```
minimal_backoff_time = 10m
maximal_backoff_time = 30m
queue_run_delay = 10m
bounce_queue_lifetime = 2h
maximal_queue_lifetime = 2h
```


----------

最近搞 mail server 真的大崩潰，連帶系上跟者我們一起崩潰 Sorry…QQ
果然還是盡快轉移到 G Suite 好了…..

