---
title: Setup Slurm Cluster
date: 2019-03-16 23:06:53
tags:
- unix
- slurm
- note
---

Slurm 是一個專門拿來做分散式平行運算的平台，已被各式超級運算電腦群集採用<sup>[1]</sup>。跟 Hadoop 其實有點像，但是我個人感覺是 Slurm 好用太多，更穩定更快速，而且不用會 Java...XD
最近剛好有機會需要建立以及管理一個 Slurm Cluster，就想說來記錄一下過程以及一些雷。

<!-- more -->

先來看一張 Slurm 架構的圖，基本上最重要的兩個東西就是 (1) Slurm Controller (slurmctld) 跟 (2) Slurm Compute Node (slurmd)，Controller 是拿來分配任務用的，他管理所有 Compute Node，負責決定哪個任務該去哪個 Node 執行，而 Compute Node 就是真的會執行任務的機器。

{% zoom /img/2019-03-16/1.png Slurm 架構圖。 <sup>[2]</sup>%}

所以要建置一個 Slurm Cluster，最少要弄一個 Controller 跟多個 Compute Nodes，至於其他像是 slurmdbd 等等，就並不是必需的東西。

# Preparation

在開始安裝 Controller 跟 Compute Node 之前，要先準備一些事情，
1. 需要安裝 `munge`，透過 `apt-get install libmunge-dev libmunge2 munge` 即可。
2. 需要創一個 `slurm` 帳號跟一個 `munge` 帳號，並且要在所有機器上都有這些帳號 (uid 也必須一致)。

`munge` 是 slurm 拿來做 Authentication 的組件。

```sh
# Create a slurm user, and change it to some id, the is must same across nodes.
$ useradd slurm; usermod slurm -u 151; groupmod -g 151 slurm;
 
# Change the munge user id, the is must same across nodes.
$ killall munged; usermod munge -u 150; groupmod -g 150 munge; chown munge:munge -R /var/log/munge/ /run/munge /var/lib/munge /etc/munge
```

# Setup Slurm Controller

下載原始碼來編譯然後安裝

```sh
cd /tmp; wget https://download.schedmd.com/slurm/slurm-18.08.2.tar.bz2; tar xvjf slurm-18.08.2.tar.bz2; cd slurm-18.08.2/
(./configure --prefix=/usr && make && make install) | tee /tmp/slurm.setup.log 2>&1

```

雖然 `apt-get install slurm` 有東西，但那個不是對的...

安裝好以後，可以透過一個網頁來設定基本的 config 檔，預設位置在 `/usr/share/doc/slurmctld/slurm-wlm-configurator.html`，設定好以後存檔並放至 `/etc/slurm-llnl/slurm.conf`。記得更改權限。然後就可以啟用。

```sh
# set slurmctld & slurmdbd auto start via systemd (only for the controller)
cp /tmp/slurm-18.08.2/etc/slurmctld.service /lib/systemd/system/slurmctld.service
cp /tmp/slurm-18.08.2/etc/slurmdbd.service /lib/systemd/system/slurmdbd.service
systemctl daemon-reload                  # force systemd reload unit
systemctl enable slurmdbd slurmctld      # force slurmdbd & slurmctld start after the machine is ready
systemctl start slurmdbd slurmctld       # start slurmdbd & slurmctld
systemctl status slurmdbd slurmctld      # check slurmdbd & slurmctld status
systemctl is-enabled slurmdbd slurmctld  # check slurmdbd & slurmctld enabled
```

# Setup Slurm Compute Nodes

Slurm Compute Node 也可以透過 `apt` 安裝，但是由於我需要使用 slurm 的一些 api，所以這部分會使用從 source code 建置。

先安裝 `munge`，改 user id 以及複製 munge key:

```sh
# Copy munge key from slurm controller
$ scp controller:/etc/munge/munge.key /etc/munge/
 
# Change the permissions
$ chown munge:munge /etc/munge/munge.key
$ chmod 400 /etc/munge/munge.key
 
# Start munge service
$ service munge start
```

接下來先下載 slurm source code，並且 build

```sh
# Install slurm
$ cd /tmp; wget https://download.schedmd.com/slurm/slurm-18.08.2.tar.bz2; tar xvjf slurm-18.08.2.tar.bz2; cd slurm-18.08.2/
$ (./configure && make && make install) | tee /tmp/slurm.setup.log 2>&1
 
# Copy slurm.conf, and add slurm user
$ mkdir /usr/etc /var/spool/slurmctld /var/spool/slurmd
$ scp controller:/usr/etc/slurm.conf /usr/etc/slurm.conf
$ useradd slurm; usermod slurm -u 151; groupmod -g 151 slurm; chown slurm:slurm -R /var/log/slurm* /run/slurm* /var/lib/slurm* /etc/slurm* /var/spool/slurm*

# set slurmd auto start via system (for the controller and workers)
cp /tmp/slurm-18.08.2/etc/slurmd.service /lib/systemd/system/slurmd.service
systemctl daemon-reload     # force systemd reload unit
systemctl enable slurmd     # force slurmd start when the machine is ready.
systemctl start slurmd      # start slurmd
systemctl status slurmd     # check slurmd status
systemctl is-enabled slurmd # check slurmd enabled 
```

到此基本完成 Slurm Cluster 的設定，可以透過一些指令來檢查 slurm 的狀態。

**sinfo**: 會顯示目前 cluster nodes 的狀態

```
PARTITION AVAIL  TIMELIMIT  NODES  STATE NODELIST
research*    up   infinite      1   idle research[01-10]
research*    up   infinite      3  alloc research[11-15]
```

**squeue**: 顯示目前正在執行/等待執行的任務

```
 JOBID PARTITION     NAME     USER ST       TIME  NODES NODELIST(REASON)
578116  research     test  user123  R       0:06      1 research12
578116  research     test  user123  R       0:06      1 research12
578116  research     test  user123  R       0:06      1 research12
578116  research     test  user123  R       0:13      1 research15
578116  research     test  user123  R       0:16      1 research13
```

**scancel**: 取消任務

還有很多其他指令，可以看這張 [Cheat sheet](https://slurm.schedmd.com/pdfs/summary.pdf)。

# Some Common Issues

使用的過程中總是會遇到一些奇奇怪怪的問題，這邊就列舉一些我常見的:

## Zero Bytes were transmitted or received

在使用 slurm 相關的指令時噴出的錯誤。
這個基本上是因為 Authentication 出錯，把所有 nodes 的 munge 重啟就會解決。

## Slurm job stock in CG state

有時候會發現有一些 Job 就是一直卡在 Completing (CG state)，這時候把那個 node 設為 down 再設為 resume 就會消失了。

```sh
$ scontrol update nodename=research04 state=down reason=job_stuck;
$ scontrol update nodename=research04 state=resume
```

## Invalid job credential

這表示有些 node 沒有 slurm, munge user，或者他們的 uid 不一致，解決方法就是把他們設為一致。

---

Reference:
[1] https://en.wikipedia.org/wiki/Slurm_Workload_Manager
[2] https://slurm.schedmd.com/overview.html