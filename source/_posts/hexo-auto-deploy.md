---
title: 用 Travis CI 自動部屬 hexo 到 GitHub
date: 2016-07-29 00:51:43
tags:
- hexo
- automation
image: /img/2016-07-29/2.PNG
---

其實 [hexo](https://hexo.io/) 作者 TC 已經有發過[一篇文章](https://zespia.tw/blog/2015/01/21/continuous-deployment-to-github-with-travis/)在講這個主題了，也講得很清楚了，基本上~~矇著眼睛~~照做就行了。
而這篇主要是再補充幾個細節。

<!-- more -->

## SSH KEY

  矇著眼照做[那篇](https://zespia.tw/blog/2015/01/21/continuous-deployment-to-github-with-travis/)，到這行:

  ```
  $ travis encrypt-file ssh_key --add
  ```

  這邊會幫你上傳 ssh_key 到 Travis 上，`--add`這個flag可以幫你插入解密指令到`.travis.yml`的`before_install`。
  不過這 flag 真的很機車，會把你的`.travis.yml`排版全搞亂，順便把註解刪光光！
  建議不要加`--add`自己手動插入解密指令，排版就不會亂掉。
  而且用 Windows 的人會在解密文件時莫名失敗，所以只能用 Mac 或 Unix 環境做這件事([File decryption fails on Windows](https://github.com/travis-ci/travis-ci/issues/4746))，超雷...

  另外，如果因某種天災人禍導致忘記或沒辦法用指令插入解密指令，還是可以上 Travis 上的設定中看到環境變數名稱。

  {% zoom /img/2016-07-29/2.PNG repository > more options 可以設定、看到 Travis 的環境變數 %}

## USE SSH

  Travis 是用 GitHub 的 [Deploy key](https://developer.github.com/guides/managing-deploy-keys/) 來存取 repository 的，關於如何產生以及設定 Deploy key 都照著 TC [那篇文章](https://zespia.tw/blog/2015/01/21/continuous-deployment-to-github-with-travis/)做就可以了。
  如果不幸在`hexo deploy`時遇到錯誤如下:

  ```
  remote: Invalid username or password.
  fatal: Authentication failed for "...."
  ```
  
  那可以檢查一下 hexo 的`_config.yml` `deploy`的部分，要用 ssh 的形式設定 repository

  ```title: _config.yml
  deploy:
    type: git
    repo: git@github.com:SSARCandy/ssarcandy.github.io.git
    branch: master
  ```

## SETTING UP .travis.yml

我這個網站結構如下:
> [develop] -> default branch，我在這條 branch 新增文章、修改樣式等等
> [master]  -> 放 static-files，也就是 hexo generate 出來的東東
  
讓 Travis 自動部屬時，Clone 的是 `develop` branch， 經過`hexo generate`後推到`master` branch 上，為了避免 forced-update，在`.travis.yml`中需要再設定一下。

附上我的 `.travis.yml`，基本上跟 TC 那篇 87% 像啦...


```bash title: .travis.yml
language: node_js
node_js:
  - "4"
 
before_install:
  # Decrypt the private key
  - openssl aes-256-cbc -K $encrypted_d7634ff77415_key -iv $encrypted_d7634ff77415_iv -in .travis/ssh_key.enc -out ~/.ssh/id_rsa -d
  # Set the permission of the key
  - chmod 600 ~/.ssh/id_rsa
  # Start SSH agent
  - eval $(ssh-agent)
  # Add the private key to the system
  - ssh-add ~/.ssh/id_rsa
  # Copy SSH config
  - cp .travis/ssh_config ~/.ssh/config
  # Set Git config
  - git config --global user.name "ssarcandy"
  - git config --global user.email ssarcandy@gmail.com
  # Install Hexo
  - npm install hexo -g
  # Clone the repository
  - git clone https://github.com/SSARCandy/ssarcandy.github.io .deploy_git
  # My static-files store on master branch
  - cd .deploy_git && git checkout master
  - cd ..
 
script:
  - hexo generate
  - hexo deploy
 
branches:
  only:
  - develop
```

比較需要解說的是這段

```bash
  # Clone the repository
  - git clone https://github.com/SSARCandy/ssarcandy.github.io .deploy_git
  - cd .deploy_git && git checkout master
  - cd ..
```

`.deploy_git`是 hexo 會產生的資料夾，用於紀錄 git history，不過由於每次 clone 都是全新的，所以每次`.deploy_git`也都會是新的，這會導致每次更新都會是 forced-update。
所以，複製一份 repo (at `master` branch)，並改名叫`.deploy_git`就是為了讓新產生出的靜態檔案可以有之前的 git history，就可以避免 forced-update。
