# 两位法师补充资料 · 2026-10-08

在既有两位人物四栏目基础上，新增102个已审查原文／明确版本的转录分组，使总数到26部可读文集721分组：虚云598、弘一123。独立馆藏书法6项与央视现代影音出处23项（影视20集、访谈3项）分别显示书写者／制作方，均不制造站内播放、保存／进度或假原著。

此次增量同步保留官网原7755索引（含3个官网独有篇目），只追加102；不覆盖并行合入的版本化Music路由，不修改下载渠道。RN合并候选0ab83180f6a58345d75488a6b842607fdb736732含现有9f706285的Auth／clock／Music更新；正文仍由原隔离Staging Supabase版本化服务承接。

校验：官网265tests、lint/build/source-manifest通过；H5 production artifact双浏览器20通过；新原文源重建98／4与原619不变；新数据库批次rollback-only预检通过。

新内容App直达默认关闭；原4位人物的既有开关与链接保持。待匹配最终候选固定壳及双端直达／续读等原生路径通过后，Owner才可启用VITE_MASTERS_HISTORICAL_APP_CONTENT_ENABLED=true（同时保留既有内容开关）。不以网页或JS导出当Release验收。Production仍遵守后台人类验收和exact-SHA审批，不能直接promote或改alias。
