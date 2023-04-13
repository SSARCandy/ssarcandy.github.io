---
title: 安裝 Policyd 並設定外寄 Quota
date: 2016-12-24 00:15:40
tags:
- unix
- note
---


最近遇到一個問題，有人利用 cmlab 的電子郵件發送垃圾郵件，導致許多外部郵件伺服器將我們加入黑名單。因此，我們認為有必要設定一個寄件上限來防止這種情況。雖然 Postfix 本身已經具有許多可設定的功能，包括防止垃圾郵件等，但它無法設定寄件的配額，所以我們打算嘗試使用 Policyd。

Policyd（又名 Cluebringer）是一個類似於中間件的軟體，它可以為郵件伺服器設定一些規則。這可以幫助我們更靈活地管理郵件流量，提高郵件伺服器的安全性和效率。通過使用 Policyd，我們可以制定更細緻的郵件策略，有效地對抗垃圾郵件和其他濫用行為。

<!-- more -->

# 安裝

在 cluebringer 2.0 以前的版本不支援 IPv6，所以基本上只能從官網下載最新版，又，官網安裝說明充滿錯誤，我在弄得時候十分不開心….，所以決定自己整理安裝流程。

## 下載並解壓縮

```bash
$ wget http://download.policyd.org/v2.0.14/cluebringer-v2.0.14.zip
$ unzip cluebringer-v2.0.14.zip
```

## 初始化資料庫

在 `database/` 下，執行這段 shell script

```bash
for i in core.tsql access_control.tsql quotas.tsql amavis.tsql checkhelo.tsql checkspf.tsql greylisting.tsql
do
  ./convert-tsql mysql $i
done > policyd.sql
```

這邊產出的 .sql 會有語法錯誤，用 vim 開啟並下 `:%s/TYPE=innondb/ENGINE=innondb/g` 指令修改全部。

建立新資料庫並匯入 `policyd.sql` :

```bash
$ mysql -u root -p -e 'CREATE DATABASE policyd'
$ mysql -u root -p policyd < policyd.sql
```

## 複製檔案到該放的地方

```bash
$ cp -r cbp /usr/local/lib/cbpolicyd-2.1/
$ cp cbpadmin /usr/local/bin/
$ cp cbpolicyd /usr/local/sbin/
```

# 啟動

```bash
$ /usr/bin/perl /usr/local/sbin/cbpolicyd --config /etc/cluebringer.conf
```

如果啟動時遇到類似: `you may need to install the Mail::SPF module`  等等 error，就安裝這個: `sudo aptitude install libmail-spf-perl`

要查看是否有啟動成功，可以下 `ps aux | grep policyd` 指令。
要查看 port 10031 是否有在 listen，可以下 `netstat -pln | grep :10031` 指令檢查。


# 設定 Postfix 使用 Policyd

去 Postfix config 檔設定 `check_policy_service` :

```bash
smtpd_sender_restrictions = 
  ...,
  check_policy_service inet:127.0.0.1:10031
  
smtpd_recipient_restrictions = 
    ...,
    check_policy_service inet:127.0.0.1:10031,
    permit_mynetworks,
    permit
  
smtpd_end_of_data_restrictions = 
    check_policy_service inet:127.0.0.1:10031
```

在 `smtpd_recipient_restrictions` 中，`check_policy_service` 需要在 `permit_mynetworks` 上面才有用。
若要設定外寄 Quota 的話則 `smtpd_sender_restrictions` 也要加上 `check_policy_service`。

另外提醒註解不要亂放，會讓設定檔整個壞掉….
可以透過 `postconf` 指令來列出真正 postfix 吃到的設定值


# 設定 Policyd Web UI

policyd 有提供一個 web 的設定介面，讓我們比較方便設定 policyd。

複製解壓縮檔裡的 `webui/` 到 web server

```bash
$ cp -r webui /var/www/
$ vim /var/www/webui/include/config # 填上該填的資訊
```

需要把擁有者改成 www-data

```bash
$ chown -R webui
$ chgrp -R webui
```

就可以直接連上 web 介面: `http://your.domian/webui/`

這 web 介面預設不用登入，大家都可以隨意更改，所以必須利用其他方式加個密碼保護。

這邊是用 `lighthttpd` 設定密碼

```bash
$ cd /etc/lighthttpd
$ vim pwd # user:password
$ vim lighthttpd.conf
```

詳細可以參考: [Lighttpd setup a password protected directory (directories)](https://www.cyberciti.biz/tips/lighttpd-setup-a-password-protected-directory-directories.html)


# 設定 Rate Limit

到這邊就簡單了，藉由 web 介面按按按鈕就可以設定各種 Quota，詳細可參考這篇圖文教學:
[How To Configure Rate Limit Sending Message on PolicyD](https://imanudin.net/2014/09/09/zimbra-tips-how-to-configure-rate-limit-sending-message-on-policyd/)

# 驗證

想確定是不是有成功，可以去 mySQL > policyd > quota_tracking 查看是不是真的有在追蹤大家的流量。

或者也可以看 mail.log ，會有流量的 log 資訊，包含還剩多少用量等等資訊。

```
$ tail /var/log/mail.log | grep cbpolicyd
Jan 20 00:02:05 cml2 cbpolicyd[32562]: module=Quotas, mode=update, reason=quota_update,
policy=6, quota=3, limit=4, track=Sender:xxx, counter=MessageCount, quota=1.00/200 (0.5%)
```


# Reference
1. [Policyd-Installing](http://wiki.policyd.org/installing)
2. [Postfix + Centos + Policyd V2 + MySQL](https://www.kutukupret.com/2009/09/13/postfix-centos-policyd-v2-mysql/)
3. [Policyd(Cluebringer) installation](http://en.enisozgen.com/policydcluebringer-installation/)
4. [How To Configure Rate Limit Sending Message on PolicyD](https://imanudin.net/2014/09/09/zimbra-tips-how-to-configure-rate-limit-sending-message-on-policyd/)
5. [Lighttpd setup a password protected directory (directories)](https://www.cyberciti.biz/tips/lighttpd-setup-a-password-protected-directory-directories.html)

{% ref_style %}

