---
title: "Setup CouchDB Cluster using Docker Swarm"
source: https://ssarcandy.tw/2021/01/25/setup-couchdb-using-docker-swarm/
date: 2021-01-25
updated: 2026-07-07
tags: [unix]
---

# Setup CouchDB Cluster using Docker Swarm

CouchDB，一個主打安裝好之後就可以直接有原生 Http API 進行 CRUD (新增、讀取、修改、刪除) 的 NoSQL 資料庫，對於較簡單的應用程式甚至就直接免去後端的開發成本，直接對接 CouchDB Http API 介面即可。

除此之外，CouchDB 同時也主打所謂的 muti-master cluster 架構，可以輕易地設定多個 CouchDB instances 來達到 HA 的目的，確保服務不會因為伺服器掛掉而無法存取。

而本篇就是在記錄如何透過 Docker Swarm 來佈署跨機器的三個 CouchDB 並且將之設定為 cluster mode.

![](https://ssarcandy.tw/img/2021-01-26/1.png)

# Prerequisites

在開始之前，由於我是打算要用 docker swarm 做跨機佈署，所以首先要先準備好環境：

-   三台有不同 Public IP 的 Linux server
-   三台都裝好 docker
-   三台機器都設為 docker swarm mode

如何將 docker 設定成 swarm mode 可以參考[文件](https://docs.docker.com/engine/swarm/)，基本上就只要：

```bash
# init swarm
$ docker swarm init

# add into existing swarm
$ docker swarm join --token <token>
```

設定好之後可以用 `docker node ls` 確認一下，結果會類似如下：

```bash
$ docker node ls
ID                            HOSTNAME            STATUS              AVAILABILITY        MANAGER STATUS      ENGINE VERSION
2v2lb55cyes0rf3tbtqe2zp9x *   docker-node-1       Ready               Active              Reachable           19.03.13
2gedpa6dac3c80ilr3f9ji3fw     docker-node-2       Ready               Active              Leader              19.03.13
7zj2xk3up7ce34atj2nme9rf9     docker-node-3       Ready               Active              Reachable           19.03.13
```

# Setup CouchDB as Single Node

我們要使用的會是官方的 docker image — `couchdb:3.1.1`

要使用其實不難，這邊可以示範一下在本機佈署 single node 的方式，`docker-compose.yml`

```yml
version: "3.8"
 
services:
  couchdb:
    environment:
      COUCHDB_USER: "admin"
      COUCHDB_PASSWORD: "admin123"
      COUCHDB_SECRET: 46d689495ca02e8c35c3a3f683000ef1
      NODENAME: "couchdb01"
      ERL_FLAGS: "-setcookie a20b37d83ef18efce400b3ace400036e"
    image: couchdb:3.1.1
    ports:
      - "5984:5984"
      - "9100:9100"
      - "4369:4369"
```

可以透過 docker compose 來嘗試執行這個檔案：

```bash
$ docker-compose up -d
$ docker-compose ps
Name                     Command               State                                   Ports                                 
-----------------------------------------------------------------------------------------------------------------------------------
couchdb_couchdb_1   tini -- /docker-entrypoint ...   Up      0.0.0.0:4369->4369/tcp, 0.0.0.0:5984->5984/tcp, 0.0.0.0:9100->9100/tcp
```

然後就可以訪問 CouchDB 內建的管理介面: `http://<IP>:5984/_utils/`，接下來到 setup 頁面依照指示設定 single node，即可。

![去 Verify 介面測試是否完成安裝。](https://ssarcandy.tw/img/2021-01-26/2.png) 

至此就完成 Single Node CouchDB 的安裝，可喜可賀。

# Deploy as CouchDB Cluster Mode

剛剛嘗試了一鍵佈署 single node 的 CouchDB，那接下來就來嘗試主角吧 — Cluster Mode

CouchDB 的 cluster mode 設定比起 single node 來的複雜非常多，而且存在許多坑 (都不會有 error log 的坑)，我這邊就是紀錄我摸索無數夜晚得出的結果😵

首先我先列出要設定 cluster mode 必須要滿足的條件：

-   每個 CouchDB 必須要有一樣的 admin & password & secret & erl cookie，這對應到 docker image 的 `COUCHDB_USER`, `COUCHDB_PASSWORD`, `COUCHDB_SECRET`, `ERL_FLAGS`
-   每個 CouchDB 必須要可以透過 `NODENAME` 來互相溝通
-   每個 CouchDB 必須要有同樣的 uuid

## Prepare config.ini

為了要保證大家的 Config 一致，這邊我要用事先準備好的 `config.ini`，而非透過 yml 的 environment 傳參數，這個方法也是[官方建議的方法](https://github.com/apache/couchdb-docker#configuring-couchdb)\[1\]:

> The best way to provide configuration to the `%%REPO%%` image is to provide a custom ini file to CouchDB, preferably stored in the `/opt/couchdb/etc/local.d/` directory. There are many ways to provide this file to the container (via short Dockerfile with FROM + COPY, via Docker Configs, via runtime bind-mount, etc), the details of which are left as an exercise for the reader.

那接下來就來準備 `config.ini`：

```bash
[admins]
admin = -pbkdf2-07fe7c8d94281cafdfa065c0f9dd9b6fae56b649,8a3bfe04b1f4294d89d9e9d250fce77a,10

[couch_httpd_auth]
secret = 46d689495ca02e8c35c3a3f683000ef1

[couchdb]
uuid = 7ff6dd245116a7288b798b003f00099e
```

這邊就有一個坑，就是 admin 的 password 必須要是 hash 版本的，如果這邊是 plain text 的話，在啟動時 CouchDB 會自動做 hash，然後就會導致三台 CouchDB 的 password 不一致 (同樣的密碼 hash 的結果會不一樣，相關文章： [Timing Attack in String Compare](https://ssarcandy.tw/2020/01/29/timing-attack/ "Timing Attack in String Compare") )；密碼不一致就會出現 `unable to sync admin passwords` 錯誤。

那關於要如何獲取 hash 過的密碼，官方是推薦透過建立一個 dummy 的 single node，然後去看他 hash 出來的密碼長怎樣，再 copy 過來 (好蠢…)

這邊提供另一個方法，如[這篇文章](https://blog.sleeplessbeastie.eu/2020/03/13/how-to-generate-password-hash-for-couchdb-administrator/)\[2\]所說，可以透過 python script 產生 hashed password：

```bash
$ PASS="admin123" SALT="8a3bfe04b1f4294d89d9e9d250fce77a" ITER=10 \
  python3 -c "import os,hashlib; print('-pbkdf2-%s,%s,%s' % (hashlib.pbkdf2_hmac('sha1',os.environ['PASS'].encode(),os.environ['SALT'].encode(),int(os.environ['ITER'].encode())).hex(), os.environ['SALT'], os.environ['ITER']))"
-pbkdf2-07fe7c8d94281cafdfa065c0f9dd9b6fae56b649,8a3bfe04b1f4294d89d9e9d250fce77a,10
```

## Using same config across nodes

官方說了三種方式提供 ini 檔：

-   via Dockerfile COPY — 這太蠢了，每次改 config 都要重新 build
-   via Docker Config — ok 👍
-   via runtime mount — 在 docker swarm 比較不適合，因為不是所有 node 都能夠 mount

所以其實只剩下 [Docker Config](https://docs.docker.com/engine/swarm/configs/) 較適當。

docker config 設定方式如下，

```yml
services:
  couchdb:
    # ...skip
    configs:
      - source: couchdb_conf
        target: /opt/couchdb/etc/local.d/config.ini
 
configs:
  couchdb_conf:
    file: ./config.ini
```

我們將事先準備好的 `config.ini` 透過 docker config 掛載至所有 CouchDB 的 `local.d` 資料夾。

這裡有另一個坑，有可能會出現 CrashLoopBackOff 的狀況，我嘗試發現根本沒辦法掛載到 `/opt/couchdb/` 底下的任何目錄，大概是 bug 吧，這邊有相關 [GitHub issue](https://github.com/apache/couchdb-docker/issues/73)\[3\]。

為了繞過這個不能 mount 的問題，必須要覆寫 entrypoint，先把 config file copy 到適當的位置再執行原本的 entrypoint，所以會改成這樣：

```yml
services:
  couchdb:
    # ...skip
    entrypoint: /bin/bash -c "cp -f /couchdb_conf /opt/couchdb/etc/local.d/couch.ini && tini -- /docker-entrypoint.sh /opt/couchdb/bin/couchdb"
    configs:
      - couchdb_conf
 
configs:
  couchdb_conf:
    file: ./config.ini
```

這樣改意思是先把 config 掛載至別的地方，然後在執行 entrypoint 時先 copy 至正確位置之後再執行原本的指令。

### Join All CouchDB Instances as a Cluster

至此我們已經可以撰寫出完整的 `docker-swarm.yml`

```yml
version: "3.8"
 
services:
  couchdb:
    environment:
      NODENAME: "{{.Service.Name}}.{{.Task.Slot}}.{{.Task.ID}}"
      ERL_FLAGS: "-setcookie a20b37d83ef18efce400b3ace400036e"
    image: couchdb:3.1.1
    deploy:
      mode: global
    networks:
      network:
        aliases:
          - couchdb
    ports:
      - "5984:5984"
      - "9100:9100"
      - "4369:4369"
    entrypoint: /bin/bash -c "cp -f /couchdb_conf /opt/couchdb/etc/local.d/couch.ini && tini -- /docker-entrypoint.sh /opt/couchdb/bin/couchdb"
    configs:
      - source: couchdb_conf
        target: /opt/couchdb/etc/local.d/config.ini
 
networks:
  network:
 
configs:
  couchdb_conf:
    file: ./couchdb-conf.ini
```

這邊我用 `global mode` 是因為我希望每一台機器恰好只有一個 CouchDB。(上面的 yml 我也沒有掛 volume 所以資料會在 container 不見時一起消失)。

`NODENAME: "{{.Service.Name}}.{{.Task.Slot}}.{{.Task.ID}}"` 則是因為透過 docker swarm 佈署時，他的命名規則就是長這樣，在 docker 裡面是可以透過這個 nodename ping 到別台的。要查詢 docker container name 的話只要 `docker ps` 就可以看到。

接下來就直接佈署：

```bash
$ docker stack deploy -c docker-swarm.yaml test
$ docker stack ps test                     
ID                  NAME                                     IMAGE               NODE                DESIRED STATE       CURRENT STATE          
ynacuaj8tx35        test_couchdb.7zj2xk3up7ce34atj2nme9rf9   couchdb:3.1.1       docker-node-3       Running             Running 25 seconds ago
5p5w38jtjh7z        test_couchdb.2v2lb55cyes0rf3tbtqe2zp9x   couchdb:3.1.1       docker-node-1       Running             Running 25 seconds ago
bekjdetq739z        test_couchdb.2gedpa6dac3c80ilr3f9ji3fw   couchdb:3.1.1       docker-node-2       Running             Running 26 seconds ago
```

每個 node 都起來之後就可以去做最後的設定，CouchDB 設定 Cluster 的方式是透過 admin http api 去把其他 CouchDB 加進某台。

```bash
$ curl -X PUT "http://admin:admin123@<IP>:5984/_node/_local/_nodes/couchdb@test_couchdb.2v2lb55cyes0rf3tbtqe2zp9x.strqjl8lsdm58tozn59mp8du7" -d {}
{"ok":true,"id":"couchdb@test_couchdb.2v2lb55cyes0rf3tbtqe2zp9x.strqjl8lsdm58tozn59mp8du7","rev":"1-967a00dff5e02add41819138abb3284d"}

$ curl -X PUT "http://admin:admin123@<IP>:5984/_node/_local/_nodes/couchdb@test_couchdb.7zj2xk3up7ce34atj2nme9rf9.u5ce5bl7cmjlhkb2781cye7py" -d {}
{"ok":true,"id":"couchdb@test_couchdb.7zj2xk3up7ce34atj2nme9rf9.u5ce5bl7cmjlhkb2781cye7py","rev":"1-967a00dff5e02add41819138abb3284d"}

$ curl -X POST -H "Content-Type: application/json"  "http://admin:admin123@<IP>:5984/_cluster_setup" -d '{"action": "finish_cluster"}'
{"ok":true}
```

都加好之後，可以透過 `/_membership` 檢查是否正確：

```bash
$ curl "http://admin:admin123@<IP>:5984/_membership"
{
  "all_nodes": [
    "couchdb@test_couchdb.2gedpa6dac3c80ilr3f9ji3fw.irqxr1k8e9v8xekae1xtuxxab",
    "couchdb@test_couchdb.2v2lb55cyes0rf3tbtqe2zp9x.strqjl8lsdm58tozn59mp8du7",
    "couchdb@test_couchdb.7zj2xk3up7ce34atj2nme9rf9.u5ce5bl7cmjlhkb2781cye7py"
  ],
  "cluster_nodes": [
    "couchdb@test_couchdb.2gedpa6dac3c80ilr3f9ji3fw.irqxr1k8e9v8xekae1xtuxxab",
    "couchdb@test_couchdb.2v2lb55cyes0rf3tbtqe2zp9x.strqjl8lsdm58tozn59mp8du7",
    "couchdb@test_couchdb.7zj2xk3up7ce34atj2nme9rf9.u5ce5bl7cmjlhkb2781cye7py"
  ]
}
```

這樣就設定完成啦🎉 (記得再去管理介面 verifyinstall 檢查一次)

# Test High Availability

設定好 cluster 之後就要來驗證 HA 是否正常，這邊測試的方法會是先在某台 CouchDB 新增資料，理論上其他台也會可以存取這筆資料：

先建立一個新 database 以及一個新 document：

```bash
$ curl -X PUT "http://admin:admin123@<server01>:5984/mydatabase"  
{"ok":true}

$ curl -X PUT "http://admin:admin123@<server01>:5984/mydatabase/01" -d '{"key": "val"}'        
{"ok":true,"id":"01","rev":"1-00e36163fac5c61bb681fef0c52528e2"}
```

接下來這個 document 會自動 replicated 到其他兩台 CouchDB，可以透過分別 curl 每一台來驗證是否有一樣的 document：

```bash
$ curl "http://admin:admin123@<server01>:5984/mydatabase/01"                    
{"_id":"01","_rev":"1-00e36163fac5c61bb681fef0c52528e2","key":"val"}

$ curl "http://admin:admin123@<server02>:5984/mydatabase/01"
{"_id":"01","_rev":"1-00e36163fac5c61bb681fef0c52528e2","key":"val"}

$ curl "http://admin:admin123@<server03>:5984/mydatabase/01"
{"_id":"01","_rev":"1-00e36163fac5c61bb681fef0c52528e2","key":"val"}
```

這樣即使任意機器掛掉，整個系統都還是可以維持運作。

(實務上再去疊一層 Load Balancer 讓 Http endpoint 統一會更方便)

# Conclusion

設定 single node 很簡單，但設定 cluster mode 頗複雜，我個人覺得 error log 沒有非常完整，很多各式各樣的坑都會直接死掉根本不會有任何 log，很崩潰…😱。

# References

1.  [Configuring CouchDB](https://github.com/apache/couchdb-docker#configuring-couchdb)
2.  [How to generate password hash for CouchDB administrator](https://blog.sleeplessbeastie.eu/2020/03/13/how-to-generate-password-hash-for-couchdb-administrator/)
3.  [Configuration from docker config or secret? #73](https://github.com/apache/couchdb-docker/issues/73#issuecomment-766179802)
