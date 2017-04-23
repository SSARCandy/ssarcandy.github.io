---
title: Migrate mail server to Gmail - using migration tool
date: 2017-04-23 19:36:51
tags:
- unix
- note
---

最近 CMLab 終於申請到 G Suite for Education 了～
也就是我們不用再維護自己的 mail server 了～灑花～

但這也就又多了一件事：Migration...
我們要做的事情有以下幾件：

1. 讓 MX record 指到新的位置，也就是 google 的伺服器
2. 遷移群組
3. 遷移舊信

其中 2, 3 並非必須做的，但為了讓大家可以無痛轉移，我們才決定要搬信以及同步群組。
其中 1, 2 十分容易，就照著說明就可以完成，真的不會的話還可以打給 Google 救援 XD
而本篇要紀錄的是 **遷移舊信** 的部分，這是其中最麻煩也最繁瑣的部分…

<!-- more -->

# 設定資料遷移工具

G Suite 中有提供資料遷移的工具，其中包含遷移舊信件，
他的方法是透過 IMAP 下載 dovecot 信件再匯入至 Gmail.

遷移設定中，要設定以下幾個東西：

- 原郵件伺服器類型 → 我們的例子要選 **其他電子郵件伺服器**
- 原本的 IMAP server
- 管理者帳號 → 這好像沒甚麼重要的，只是他會收到遷移報告書


# Password mismatch

這邊可能會遇到問題(帳號密碼不正確/password mismatch?)，可以查看 `/var/log/mail.log` 中的詳細錯誤訊息：

```
Mar 16 19:00:54 cml2 dovecot: auth-worker(10594): pam(ssarcandy@cmlab.csie.ntu.edu.tw,173.194.90.100):
pam_authenticate() failed: Authentication failure (password mismatch?)
```

這是因為這邊使用 full email address 去登入 IMAP server，而原本我們 dovecot 的設定是只要打 user name 就好(不用加 @domain)，才會造成帳密不正確的問題。

為了迎合 G suite 的格式，去原郵件伺服器更改 dovecot 設定：

```bash
$ vim /etc/dovecot/conf.d/10-auth.conf
 
# 找到 auth_username_format
# 反註解並改成 auth_username_format = %n
```

其中 `auth_username_format` 是指登入的 username 格式，預設是只有 @ 前面的部分。
由於 G suite 那邊就是要用 full address 登入，故這邊改成 `%n` ，亦即捨棄 @ 後面的東西，只留下 @ 前面的部分 。

改完之後記得重啟 dovecot

```bash
$ service dovecot restart
[ ok ] Restarting IMAP/POP3 mail server: dovecot.
```


# 設定遷移範圍

下一步是要設定要遷移的時間、資料夾等，
以我們的例子而言：

- 時間選到 cmlab 創立以來的全部 ～(遷移！全都遷移！
- 資料夾則選擇忽略幾個特定資料夾，像是 `virus-mail` , `trash-mail`, `spam-mail` 等等

{% zoom /img/2017-04-23/01.jpg 完整的資料遷移設定 %}


# 選取遷移的使用者

接下來可以直接上傳一個 csv 檔，其中包含：

- 原郵件伺服器帳號
- 原郵件伺服器密碼
- 對應的 gmail 帳號

上傳時有個潛規則，csv 檔不可以超過 500 行，超過它就會說未知錯誤(對，這是我們試出來的…

另外，在遷移時有幾個常見的錯誤：

## 驗證失敗

錯誤(18017)：驗證失敗。
這表示所提供的原郵件伺服器帳號、密碼不正確，
也就是可能這個人不存在原郵件伺服器，或者提供的密碼不正確。

如果原郵件伺服器的驗證是像我們一樣透過 LDAP 的話，可以用 `ldapsearch` 確認這人在不在：

```bash
$ ldapsearch -x "uid=??,dc=base_dn"
```

## 連線至來源郵件伺服器時發生錯誤

錯誤(18002)：連線至來源郵件伺服器時發生錯誤。
這錯誤是對應到 roundcube 的 **連線到 imap 伺服器失敗** 錯誤，有兩個可能：

1. 因為那個人沒有家目錄
2. uid mismatch → `/var/spool/mail/username` 的擁有者是錯誤的

會發生沒有家目錄的情況在我們的狀況而言就是那個人已被停權，那就根本不用遷移了。
而 uid mismatch 則是去 `/var/spool/mail/username` 更改成正確的擁有者就好了。

## 信箱錯誤。無法開啟資料夾或郵件

錯誤(18006)：信箱錯誤。無法開啟資料夾或郵件。
這應該是屬於暫時性的錯誤，晚一點再重試看看。

Google 其實有提供一份錯誤一覽表 → [錯誤一覽表](https://support.google.com/a/answer/6254288?hl=zh-Hant&ref_topic=6245212) (雖然有些有寫跟沒寫一樣…


# 怎麼得到大家的密碼

我想看到這邊應該會發現一個問題：
遷移的 csv 檔其中一欄要提供大家的密碼，這是即使是有 root 權限也沒辦法知道的資訊欸！
雖然我們最後還是有想到辦法，不過那過程也很繁瑣，就留到下一次介紹吧…

