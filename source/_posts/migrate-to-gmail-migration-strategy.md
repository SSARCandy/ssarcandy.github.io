---
title: Migrate mail server to Gmail - migration strategy
date: 2017-04-29 22:56:05
tags:
- unix
- note
image: /img/2017-04-29/01.JPG
---

上一篇講了如何使用 google 提供的 migration tool 來遷移郵件，但需要知道大家的密碼才能用 IMAP 存取郵件資料。
一般來說即使是 root 也是看不到密碼的，就算能也只是看到加密過後的密碼。
而本篇要紀錄的就是我們遷移策略，包含我們怎麼繞過(?)密碼這關。

<!-- more -->

# 概況

我們的伺服器是透過 LDAP 集中管理身分認證資訊，大致架構如下:

{% zoom /img/2017-04-29/01.JPG 伺服器架構: 由 LDAP 來統一管理身分資訊。 %}

除了一般工作站以外，郵件伺服器也同樣是利用 LDAP 的資訊來登入，簡單來說就是使用者只須要記得一個密碼，就可以登入各工作站以及郵件伺服器。



# 繞過密碼

想來想去最後想到兩種方法，一是從 LDAP 下手，一是從郵件伺服器下手。

## 從 LDAP 下手

雖然 root 看不到大家的密碼，但是能直接更改別人的密碼 XD
所以呢，我們可以複製出一個假的 LDAP server，就專給郵件伺服器用。


{% zoom /img/2017-04-29/02.JPG 複製一個 LDAP，專門給郵件伺服器使用。 %}


要複製一個 LDAP 並不困難，只需要安裝好 LDAP 之後把資料 dump 過來就完成了。
創造好一個 fake LDAP 之後就要來改改郵件伺服器的設定，讓他改用 fake LDAP 的資訊來做身分認證。


首先要先更改 `/etc/hosts` ，把 LDAP 對應的 ip address 改對(如果有的話)，
如果沒有用 `/etc/hosts` 的話，則記得要更改 roundcube 設定:

**更改 roundcube ldap**

```bash
$ vim /etc/roundcube/main.inc.php
```

把 `hosts` 改成 fake LDAP:

```php
$config['ldap_public']['public'] = array(
    'name'              => 'Public LDAP Addressbook',
    'hosts'             => array('fake LDAP'),
    'port'              => 389,
    'user_specific'     => false,
    'base_dn'           => 'ou=public,ou=rcabook,dc=localhost',
    'bind_dn'           => 'cn=rcuser,ou=rcabook,dc=localhost',
    'bind_pass'         => 'rcpass',
    'filter'            => '(objectClass=inetOrgPerson)',
    'groups'            => array(
        'base_dn'         => '',
        'filter'          => '(objectClass=groupOfNames)',
        'object_classes'  => array("top", "groupOfNames"),
    ),
);
```

詳細可以看 roundcube 說明文件。

弄好之後記得要刷新 `nslcd`:

```bash
$ /etc/init.d/nslcd force-reload # maybe need to reload 
```

接下來就是要更改大家密碼啦~
由於郵件伺服器現在是使用 fake LDAP 驗證資訊了，所以這時候更改密碼只會改到 fake LDAP 上的資訊，而不影響大家登入使用其他工作站。也就是說使用這種方法的壞處只有在遷移的過程中不能登入原郵件伺服器。
不過由於收發信件都已經轉移去 gmail 了，暫時不能登入原郵件伺服器其實影響應該不會太大了。

**更改 ldap user password**

```bash
$ ldappasswd -h <ldap_ip> -x -ZZ \
        -D "cn=admin,dc=your_base_dn" \
        "user_distinguished_name" \
        -s <new_password> \
        -w <ldap_admin_password>
```

以上是更改一個人 LDAP 密碼的方式，那要批次更改全部人的密碼可以這樣:

先去 `/var/spool/mail/` 找誰有郵件帳戶，然後組合成 ldap dn ，輸出到一個檔案:

```bash
$ ls /var/spool/mail/ -l \
        | grep rw \
        | awk {'print $3'} \
        | xargs -I {} echo "uid={},ou=people,dc=cmlab,dc=csie,dc=ntu,dc=edu,dc=tw" > ~/mail_all.txt
```

再組合出改密碼的指令並輸出到 `change_password.sh`

```bash
$ cat mail_all.txt \
    | xargs -I {} echo "ldappasswd -x -ZZ -D cn=admin,dc=your_base_dn {} -s <new_password> -w <ldap_password>" > change_passwd.sh
```

然後就可以:

```bash
$ ./change_password.sh
```


## 從 Mail Account 下手

從 LDAP 下手的基本上就可以解決密碼的問題，不過就是會在遷移的期間讓大家無法登入看舊信件(因為大家密碼被改掉了)，雖說影響應該不大，不過依舊是有影響的。

另一個繞過密碼的方式是從郵件帳戶下手，先創建一個假帳號，再把信件都複製到假帳號那邊，就可以用假帳號存取那個人的信件。

假設有個帳號 `ssarcandy`，實際方法如下:

1. Add a fake user into ldap, i.e. `ssarcandy_fake`
2. Create home dir for it, change the owner to `ssarcandy_fake`
3. Copy `/var/spool/mail/ssarcandy` to `/var/spool/mail/ssarcandy_fake`, and chage owner
4. Copy `~ssarcandy/mail/` to `~ssarcandy_fake/mail/` if it exist, and chage owner

寫成 script 大致如下:

```bash
#!/bin/bash
 
# $1=new fake user   -> i.e. ssarcandy_fake
# $2=correspond user -> i.e. ssarcandy
 
PASSWORD='some_password'
HOME_DIR_BASE='/data/mail_migrate_tmp'
LDAP_BASE='base dn'
LDAP_DN='ldap admin dn'
LDAP_PASS='ldap admin password'
LDAP_HOST='ip address'
 
echo "dn: uid=$1,ou=people,$LDAP_BASE
uid: $1
sn: lastname
cn: complete name
mail: $1@cmlab.csie.ntu.edu.tw
objectClass: person
objectClass: organizationalPerson
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: top
objectClass: shadowAccount
userPassword: {crypt}12345
shadowMax: 99999
shadowWarning: 7
loginShell: /bin/bash
uidNumber: 6577
gidNumber: 1000
homeDirectory: $HOME_DIR_BASE/$1"> tmp.ldif
 
# Create fake account
ldapadd -h $LDAP_HOST -ZZ -x -w $LDAP_PASS -D $LDAP_DN -f tmp.ldif
 
# Change fake account password
ldappasswd -h $LDAP_HOST -ZZ -x \
    -w $LDAP_PASS -D $LDAP_DN \
    "uid=$1,ou=people,$LDAP_BASE" -s $PASSWORD
 
# Create home dir for fake account
mkdir -p $HOME_DIR_BASE
mkdir $HOME_DIR_BASE/$1
 
# Copy mails to fake account.
cp /var/spool/mail/$2 /var/spool/mail/$1
cp -r $(eval echo ~$2)/mail $(eval echo ~$1)
 
# Change owner of copied mails
chown 6577:1000 /var/spool/mail/$1
chown -R 6577:1000 $HOME_DIR_BASE/$1
```

這就是另一個繞過密碼的方式，這方式的優點是可以不影響使用者的帳戶，也就是在遷移過程中依舊可以登入舊郵件伺服器。
但也是有缺點的，就是必須複製一份使用者的 mails，在遷移期間會浪費兩倍的容量。



# 遷移策略

我們要遷移的郵件說多不多，但也不太少，以容量來說大概 600 GB 左右。
不過空間上稍微尷尬一點，只剩 50 GB 可以使用。
所以基本上是沒辦法讓大家都使用第二種方法(創假帳號並複製郵件)，先使用 fake LDAP 轉移大部分人會是比較適當的方式。

以時間軸的方式來呈現整個遷移的過程，大致如下:

<ul class="timeline"><li><div class="direction-r"><div class="flag-wrapper"><span class="flag">設定 MX record</span></div><div class="desc">信件收發轉至 Gmail</div></div></li><li><div class="direction-l"><div class="flag-wrapper"><span class="flag">建立 fake LDAP 讓 mail server 使用</span></div><div class="desc">開始遷移大部分使用者，遷移期間使用者無法登入原郵件伺服器(因密碼不同)。</div></div></li><li><div class="direction-r"><div class="flag-wrapper"><span class="flag">讓 mail server 使用原 LDAP</span></div><div class="desc">使用者可以正常登入原郵件伺服器。</div></div></li><li><div class="direction-l"><div class="flag-wrapper"><span class="flag">針對重要使用者建立假帳號</span></div><div class="desc">開始轉移那些信件特多的使用者，使用建立假帳號的方式。</div></div></li><li><div class="direction-r"><div class="flag-wrapper"><span class="flag">善後</span></div><div class="desc">完成轉移，刪除假帳號。</div></div></li></ul>

開始遷移信件的時間點是在已將 MX record 設定完，收發功能已轉至 gmail 之後才開始的。
我們基本上分兩階段轉移信件，
第一階段是用 fake LDAP 的方式轉移大部分的使用者；
第二階段則是用假帳號的方式轉移最重要(信件特多)的使用者。

首先我們先對使用者的信件用量做分群，找出哪些人用量相似、哪些人用量特多等等。
可以利用 dovecot 的 admin 工具查詢:

```bash
# 查詢 ssarcandy 的總信件數目
$ doveadm search -u ssarcandy ALL | wc -l
14990
```

把大家的郵件數目分佈畫成圖表:

{% zoom /img/2017-04-29/04.JPG 帳戶郵件分佈圖 %}


可以看到基本上大部分人都沒甚麼信，只有少數人有超大量的信，而這些少數人會是遷移的 bottleneck，所以應該要挑出來用假帳號的方式轉移信件，才能避免讓原郵件伺服器不能登入的時間拉太長。

另外，由於 G Suite 遷移工具是一批一批遷移的，所以同一批最好大家的郵件數目都要差不多，才可以減少總體等待時間。

---

我們用以上的遷移策略，總共耗時約十天完成大家的所有信件遷移。
當初預估一周真是太天真了阿QQ


<style>.timeline,.timeline li{padding:1em 0}.timeline{position:relative;width:660px;margin:20px auto 0;list-style-type:none}.timeline:before{position:absolute;left:50%;top:0;content:' ';display:block;width:6px;height:100%;margin-left:-3px;background:#505050;background:-moz-linear-gradient(top,rgba(80,80,80,0) 0,#505050 8%,#505050 92%,rgba(80,80,80,0) 100%);background:-webkit-gradient(linear,left top,left bottom,color-stop(0,rgba(30,87,153,1)),color-stop(100%,rgba(125,185,232,1)));background:-webkit-linear-gradient(top,rgba(80,80,80,0) 0,#505050 8%,#505050 92%,rgba(80,80,80,0) 100%);background:-o-linear-gradient(top,rgba(80,80,80,0) 0,#505050 8%,#505050 92%,rgba(80,80,80,0) 100%);background:-ms-linear-gradient(top,rgba(80,80,80,0) 0,#505050 8%,#505050 92%,rgba(80,80,80,0) 100%);background:linear-gradient(to bottom,rgba(80,80,80,0) 0,#505050 8%,#505050 92%,rgba(80,80,80,0) 100%);z-index:5}.direction-l,.direction-r{width:300px;position:relative}.timeline li:after{content:"";display:block;height:0;clear:both;visibility:hidden}.direction-l{float:left;text-align:right}.direction-r{float:right}.flag-wrapper{position:relative;display:inline-block;text-align:center}.flag{position:relative;display:inline;background:#eee;padding:6px 10px;border-radius:5px;font-weight:600;text-align:left}.direction-l .flag{-webkit-box-shadow:-1px 1px 1px rgba(0,0,0,.15),0 0 1px rgba(0,0,0,.15);-moz-box-shadow:-1px 1px 1px rgba(0,0,0,.15),0 0 1px rgba(0,0,0,.15);box-shadow:-1px 1px 1px rgba(0,0,0,.15),0 0 1px rgba(0,0,0,.15)}.direction-r .flag{-webkit-box-shadow:1px 1px 1px rgba(0,0,0,.15),0 0 1px rgba(0,0,0,.15);-moz-box-shadow:1px 1px 1px rgba(0,0,0,.15),0 0 1px rgba(0,0,0,.15);box-shadow:1px 1px 1px rgba(0,0,0,.15),0 0 1px rgba(0,0,0,.15)}.direction-l .flag:before,.direction-r .flag:before{position:absolute;top:50%;right:-36px;content:' ';display:block;width:12px;height:12px;margin-top:-10px;background:#eee;border-radius:10px;border:4px solid #ff5050;z-index:10}.direction-l .flag:after,.direction-r .flag:after{content:"";position:absolute;top:50%;height:0;width:0;margin-top:-8px;pointer-events:none}.direction-r .flag:before{left:-36px}.direction-l .flag:after{left:100%;border:solid transparent;border-left-color:#eee;border-width:8px}.direction-r .flag:after{right:100%;border:solid transparent;border-right-color:#eee;border-width:8px}.time-wrapper{display:inline;line-height:1em;font-size:.66666em;color:#fa5050;vertical-align:middle}.direction-l .time-wrapper{float:left}.direction-r .time-wrapper{float:right}.time{display:inline-block;padding:4px 6px;background:#eee}.desc{margin:1em .75em 0 0;line-height:1.5em}.direction-r .desc{margin:1em 0 0 .75em}@media screen and (max-width:660px){.timeline{width:100%;padding:4em 0 1em}.timeline li{padding:2em 0}.direction-l,.direction-r{float:none;width:100%;text-align:center}.flag-wrapper{text-align:center}.flag{background:#eee;z-index:15}.direction-l .flag:before,.direction-r .flag:before{position:absolute;top:-30px;left:calc(50% + 3px);content:' ';display:block;width:12px;height:12px;margin-left:-9px;background:#eee;border-radius:10px;border:4px solid #ff5050;z-index:10}.direction-l .flag:after,.direction-r .flag:after{content:"";position:absolute;left:50%;top:-8px;height:0;width:0;margin-left:-8px;border:solid transparent;border-bottom-color:#eee;border-width:8px;pointer-events:none}.time-wrapper{display:block;position:relative;margin:4px 0 0;z-index:14}.direction-l .time-wrapper,.direction-r .time-wrapper{float:none}.desc{position:relative;margin:1em 0 0;padding:1em;background:#f5f5f5;-webkit-box-shadow:0 0 1px rgba(0,0,0,.2);-moz-box-shadow:0 0 1px rgba(0,0,0,.2);box-shadow:0 0 1px rgba(0,0,0,.2);z-index:15}.direction-l .desc,.direction-r .desc{position:relative;margin:1em 1em 0;padding:1em;z-index:15}}@media screen and (min-width:400px ?? max-width:660px){.direction-l .desc,.direction-r .desc{margin:1em 4em 0}}</style>