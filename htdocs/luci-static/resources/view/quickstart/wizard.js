'use strict';
'require view';
'require uci';
'require rpc';
'require ui';

var callSetPassword = rpc.declare({ object: 'luci', method: 'setPassword', params: [ 'username', 'password' ] });

return view.extend({
  step: 0,
  data: { wan: 'dhcp', wanIp: '', wanMask: '255.255.255.0', wanGw: '', dns: '', lanIp: '192.168.1.1', ssid: 'LuciStart', ssid5: 'LuciStart_5G', wifiKey: '', wifiKey5: '', unified: true, adminKey: '' },

  t: function(message) { return (this.i18n && this.i18n[message]) || (this.i18nEnglish && this.i18nEnglish[message]) || message; },
  localize: function(root) {
    var self=this;
    (function walk(node) {
      Array.prototype.forEach.call(node.childNodes || [], function(child) {
        if (child.nodeType === 3) child.nodeValue=self.t(child.nodeValue);
        else walk(child);
      });
    })(root);
    return root;
  },

  load: function() {
    var self=this, lang=((L.env && (L.env.lang || L.env.language)) || 'en').replace('-', '_'), base=L.resource('view/quickstart/i18n/');
    function dictionary(name) { return fetch(base+name+'.json').then(function(r) { return r.ok ? r.json() : {}; }).catch(function() { return {}; }); }
    return Promise.all([ uci.load('system'), uci.load('network'), uci.load('wireless'), uci.load('lucistart'), dictionary('en'), lang==='en' ? Promise.resolve({}) : dictionary(lang) ]).then(L.bind(function(result) {
      self.i18nEnglish=result[4]; self.i18n=result[5];
      this.completed = uci.get('lucistart', 'main', 'completed') === '1';
      this.data.lanIp = uci.get('network', 'lan', 'ipaddr') || this.data.lanIp;
      this.data.wan = uci.get('network', 'wan', 'proto') || 'dhcp';
      this.data.wanIp = uci.get('network', 'wan', 'ipaddr') || '';
      this.data.wanMask = uci.get('network', 'wan', 'netmask') || this.data.wanMask;
      this.data.wanGw = uci.get('network', 'wan', 'gateway') || '';
      var dns = uci.get('network', 'wan', 'dns');
      this.data.dns = Array.isArray(dns) ? dns.join(' ') : (dns || '');
      var wifi = uci.sections('wireless', 'wifi-iface').filter(function(s) { return s.mode === 'ap'; });
      if (wifi[0]) { this.data.ssid = wifi[0].ssid || this.data.ssid; this.data.wifiKey = wifi[0].key || ''; }
      if (wifi[1]) { this.data.ssid5 = wifi[1].ssid || this.data.ssid5; this.data.wifiKey5 = wifi[1].key || this.data.wifiKey; }
    }, this));
  },

  addStyle: function() {
    if (document.getElementById('lucistart-css')) return;
    var l = document.createElement('link'); l.id='lucistart-css'; l.rel='stylesheet'; l.href=L.resource('view/quickstart/wizard.css'); document.head.appendChild(l);
  },
  input: function(label, key, type, help, placeholder) {
    var self=this, inp=E('input',{type:type||'text',value:this.data[key]||'',placeholder:placeholder||'',change:function(e){self.data[key]=e.target.value;}});
    return E('div',{class:'ls-field'},[E('label',{},label), type==='password'?E('div',{class:'ls-password'},[inp,E('button',{type:'button',click:function(){inp.type=inp.type==='password'?'text':'password';this.textContent=self.t(inp.type==='password'?'Показать':'Скрыть');}},'Показать')]):inp, help?E('small',{class:'ls-help'},help):'']);
  },
  progress: function() {
    var names=['Интернет','Сеть','Wi‑Fi','Защита','Готово'];
    return E('div',{class:'ls-progress'},names.map(L.bind(function(n,i){return E('div',{class:'ls-step '+(i<this.step?'done':i===this.step?'active':'')},[E('div',{class:'ls-dot'},i<this.step?'✓':String(i+1)),E('span',{},n)]);},this)));
  },
  frame: function(title, sub, body, nextLabel) {
    var self=this, backAttrs={class:'ls-btn',click:function(){if(self.step===0)location.href=L.url('admin/dashboard');else{self.step--;self.redraw();}}};
    return E('div',{class:'ls-shell'},[E('div',{class:'ls-brand'},[E('span',{class:'ls-logo'}),E('span',{},'Luci Start')]),this.progress(),E('h1',{class:'ls-title'},title),E('p',{class:'ls-sub'},sub),body,E('div',{class:'ls-actions'},[E('button',backAttrs,'Назад'),E('button',{class:'ls-btn primary',click:function(){self.next();}},nextLabel||'Продолжить')])]);
  },
  renderStep: function() {
    var self=this;
    if(this.step===0) return this.frame('Подключимся к интернету','Выберите способ подключения. В большинстве домашних сетей подходит автоматический режим.',E('div',{class:'ls-content single ls-fields'},[
      E('div',{class:'ls-field'},[E('label',{},'Тип подключения'),E('select',{change:function(e){self.data.wan=e.target.value;self.redraw();}},[E('option',{value:'dhcp',selected:this.data.wan==='dhcp'},'Автоматически (DHCP)'),E('option',{value:'static',selected:this.data.wan==='static'},'Статический IP')])]),
      this.data.wan==='static'?E('div',{class:'ls-fields'},[this.input('IP‑адрес','wanIp'),this.input('Маска сети','wanMask'),this.input('Шлюз','wanGw'),this.input('DNS‑серверы','dns','text','Через пробел, например 1.1.1.1 8.8.8.8')]):E('div',{class:'ls-note'},[E('strong',{},'Рекомендуемый вариант'), 'Роутер получит сетевые параметры от провайдера автоматически.'])
    ]));
    if(this.step===1) return this.frame('Настройте домашнюю сеть','Этот адрес используется для входа в роутер. Обычно менять его не требуется.',E('div',{class:'ls-content single ls-fields'},[this.input('Адрес роутера','lanIp','text','После изменения мастер откроется по новому адресу.'),E('div',{class:'ls-note'},[E('strong',{},'Важно'), 'При смене адреса устройства ненадолго потеряют связь и подключатся снова.'])]));
    if(this.step===2) {
      var toggleAttrs={type:'checkbox',change:function(e){self.data.unified=e.target.checked;self.redraw();}};
      if(this.data.unified) toggleAttrs.checked=true;
      var wifiFields=[this.input(this.data.unified?'Имя сети (SSID)':'Имя сети 2,4 ГГц','ssid','text','От 1 до 32 символов.')];
      if(this.data.unified) {
        wifiFields.push(this.input('Пароль Wi‑Fi','wifiKey','password','Минимум 8 символов. Используйте буквы, цифры и символы.'));
      } else {
        wifiFields.push(this.input('Пароль сети 2,4 ГГц','wifiKey','password','Минимум 8 символов.'));
        wifiFields.push(this.input('Имя сети 5 ГГц','ssid5','text','Можно задать другое имя для быстрого диапазона.'));
        wifiFields.push(this.input('Пароль сети 5 ГГц','wifiKey5','password','Минимум 8 символов.'));
      }
      wifiFields.push(E('div',{class:'ls-toggle-row'},[E('label',{class:'ls-toggle'},[E('input',toggleAttrs),E('i')]),E('div',{},[E('strong',{},'Объединить сети 2,4 ГГц и 5 ГГц'),E('small',{class:'ls-help'},this.data.unified?'Устройства автоматически выберут лучший диапазон.':'Сети будут отображаться отдельно и могут иметь разные пароли.')])]))
      return this.frame('Настройте беспроводную сеть','Задайте имя и пароль Wi‑Fi. Эти данные понадобятся для подключения ваших устройств.',E('div',{class:'ls-content'},[E('div',{class:'ls-fields'},wifiFields),E('aside',{class:'ls-aside'},[E('div',{class:'ls-router'}),E('div',{class:'ls-note'},[E('strong',{},'Проверим настройки перед применением'),'Изменения вступят в силу только после успешной проверки.'])]) ]));
    }
    if(this.step===3) return this.frame('Защитите доступ к роутеру','Установите новый пароль администратора или оставьте поле пустым, чтобы не менять текущий.',E('div',{class:'ls-content single ls-fields'},[this.input('Новый пароль администратора','adminKey','password','Не используйте пароль Wi‑Fi. Рекомендуется 12 и более символов.'),E('div',{class:'ls-note'},[E('strong',{},'Пароль хранится только на роутере'),'Он нужен для входа в LuCI и не передаётся во внешние сервисы.'])]),'Проверить настройки');
    return this.frame('Всё готово к применению','Проверьте основные параметры. Связь может прерваться на одну–две минуты.',E('div',{class:'ls-content single ls-summary'},[
      E('div',{class:'ls-summary-row'},[E('span',{},'Интернет'),E('strong',{},this.data.wan==='dhcp'?'Автоматически (DHCP)':'Статический IP')]),E('div',{class:'ls-summary-row'},[E('span',{},'Адрес роутера'),E('strong',{},this.data.lanIp)]),E('div',{class:'ls-summary-row'},[E('span',{},this.data.unified?'Wi‑Fi':'Wi‑Fi 2,4 ГГц'),E('strong',{},this.data.ssid)]),this.data.unified?'':E('div',{class:'ls-summary-row'},[E('span',{},'Wi‑Fi 5 ГГц'),E('strong',{},this.data.ssid5)]),E('div',{class:'ls-summary-row'},[E('span',{},'Диапазоны'),E('strong',{},this.data.unified?'Единая сеть':'Раздельные имена')])
    ]),'Применить настройки');
  },
  validate: function(){ if(this.step===0&&this.data.wan==='static'&&(!this.data.wanIp||!this.data.wanGw)) return this.t('Укажите IP‑адрес и шлюз.'); if(this.step===1&&!/^\d{1,3}(\.\d{1,3}){3}$/.test(this.data.lanIp)) return this.t('Проверьте адрес роутера.'); if(this.step===2&&(!this.data.ssid||this.data.ssid.length>32||(!this.data.unified&&(!this.data.ssid5||this.data.ssid5.length>32)))) return this.t('Каждое имя Wi‑Fi должно содержать от 1 до 32 символов.'); if(this.step===2&&(this.data.wifiKey.length<8||(!this.data.unified&&this.data.wifiKey5.length<8))) return this.t('Каждый пароль Wi‑Fi должен содержать минимум 8 символов.'); if(this.step===3&&this.data.adminKey&&this.data.adminKey.length<8) return this.t('Пароль администратора должен содержать минимум 8 символов.'); return '';},
  next: function(){var err=this.validate();if(err){ui.addNotification(null,E('p',{},err),'warning');return;}if(this.step<4){this.step++;this.redraw();}else this.apply();},
  redraw: function(){var n=document.querySelector('.ls-shell');if(n)n.replaceWith(this.localize(this.renderStep()));},
  restartWizard: function(){
    this.completed=false;
    this.step=0;
    var n=document.querySelector('.ls-shell');
    if(n)n.replaceWith(this.localize(this.renderStep()));
  },
  apply: function(){var self=this,root=document.querySelector('.ls-shell');root.innerHTML='';root.appendChild(this.localize(E('div',{class:'ls-status'},[E('div',{class:'ls-spinner'}),E('h1',{class:'ls-title'},'Применяем настройки'),E('p',{class:'ls-sub'},'Не выключайте роутер. Подключение восстановится автоматически.')])));
    uci.set('network','wan','proto',this.data.wan);if(this.data.wan==='static'){uci.set('network','wan','ipaddr',this.data.wanIp);uci.set('network','wan','netmask',this.data.wanMask);uci.set('network','wan','gateway',this.data.wanGw);uci.set('network','wan','dns',this.data.dns.split(/\s+/).filter(Boolean));}else{['ipaddr','netmask','gateway','dns'].forEach(function(k){uci.unset('network','wan',k);});}uci.set('network','lan','ipaddr',this.data.lanIp);
    var apIndex=0;uci.sections('wireless','wifi-iface').forEach(function(s){if(s.mode!=='ap')return;var name=self.data.unified?self.data.ssid:(apIndex===0?self.data.ssid:self.data.ssid5);var key=self.data.unified?self.data.wifiKey:(apIndex===0?self.data.wifiKey:self.data.wifiKey5);uci.set('wireless',s['.name'],'ssid',name);uci.set('wireless',s['.name'],'encryption','sae-mixed');uci.set('wireless',s['.name'],'key',key);apIndex++;});
    uci.set('lucistart','main','completed','1');
    var tasks=[uci.save()];if(this.data.adminKey)tasks.push(callSetPassword('root',this.data.adminKey));Promise.all(tasks).then(function(){return uci.apply(30);}).then(function(){root.innerHTML='';root.appendChild(self.localize(E('div',{class:'ls-status'},[E('h1',{class:'ls-title'},'Настройка завершена'),E('p',{class:'ls-sub'},self.t('Подключитесь к сети «')+self.data.ssid+self.t('». Открываем информационную панель…'))])));window.setTimeout(function(){location.replace('http://'+self.data.lanIp+'/cgi-bin/luci/admin/dashboard');},2500);}).catch(function(e){ui.addNotification(null,E('p',{},self.t('Не удалось применить настройки: ')+e.message),'error');self.redraw();});
  },
  render: function(){
    this.addStyle();
    if(this.completed) {
      var self=this;
      return this.localize(E('div',{class:'ls-shell'},[E('div',{class:'ls-status'},[
        E('h1',{class:'ls-title'},'Роутер уже настроен'),
        E('p',{class:'ls-sub'},'Можно открыть панель управления или пройти быструю настройку ещё раз.'),
        E('div',{class:'ls-actions',style:'max-width:520px;margin-left:auto;margin-right:auto'},[
          E('button',{class:'ls-btn',click:function(){location.href=L.url('admin/dashboard');}},'Открыть панель'),
          E('button',{class:'ls-btn primary',click:function(){self.restartWizard();}},'Запустить снова')
        ])
      ])]));
    }
    return this.localize(this.renderStep());
  },
  handleSaveApply:null,handleSave:null,handleReset:null
});
