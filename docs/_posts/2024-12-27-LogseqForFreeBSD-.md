---
layout: post
title: 请您在FreeBSD上协助尝试Logseq
date: 2024-12-27 T0:00:00 +08:00
categories: posts
---

{% include JavaScripts.html %}

&emsp;&emsp;笔者将生活日志与日程管理程序切换到 Logseq 很久了, 利用 syncthing 在多台设备之间同步日程非常方便. 尽管 Logseq 已经支持被安装在 Linux, MacOS, Android, iOS 和 Windows 等操作系统上, 但因为它由非常酷的酷小孩们使用前卫的语言编写的炫酷程序, 而相对学院派的 FreeBSD 暂时并不能支援这些前卫时髦的功能, 所以笔者的桌面计算机一直无法方便地查看日程计划.  
&emsp;&emsp;涼宮ハルヒ 在建立 SOS団 前说: "如果没有的话, 那就自己建一个."  
&emsp;&emsp;在一次苦恼与下决心之后, 笔者开始尝试利用 Linux 二进制兼容层将它移植到 FreeBSD. 但既然一件事开始做了不如就做好. 在确认程序可以运行之后笔者跟从 FreeBSD ports 规范封装和测试了程序的安装过程, 以方便其他人能够在同样遭遇令人困惑的境地时依然能轻松享受 Logseq 带来的乐趣.  
&emsp;&emsp;遗憾的是, 笔者的计算机性能低下到不足以遵从规范使用 jails 和 poudriere 进行隔离于笔者主机完整地测试抽象层次如此之高的语言编写的程序的运行时依赖. 因此在发布这份 ports 的同时, 邀请您在你的计算机上协助测试并完善 RUN_DEPENDS 参数. 敬请参考著名的程序员交友平台 github 中笔者的 YukiNix/Logseq-FreeBSD 仓库, 笔者荣幸地在该页面提供了详细的说明.  

&emsp;&emsp;
<p align="right">Yuki.N</p>  
