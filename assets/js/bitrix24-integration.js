
/*
 * Bitrix24 CRM lead integration for static landing forms.
 *
 * Setup:
 * 1. Replace BITRIX24_WEBHOOK_URL with your Bitrix24 inbound webhook URL for crm.lead.add.
 *    Example format: https://example.bitrix24.ru/rest/1/WEBHOOK_CODE/crm.lead.add.json
 * 2. Include this file once before </body> after the form markup.
 *
 * Do not commit a real webhook URL to a public repository.
 */
(function () {
  'use strict';

  var BITRIX24_WEBHOOK_URL = 'https://bx.ecolife33.ru/rest/1/09co8zcxg5zyjm5s/crm.lead.add';
  var RESPONSIBLE_ID = 4;
  var SOURCE_ID = 'UC_RWO7DS';
  var ROISTAT_FIELD = 'UF_CRM_1764138209';
  var THANK_YOU_URL = 'thank-you.html';
  var FORM_SELECTOR = [
    'form[onsubmit*="submitForm"]',
    'form.promo-cat-form',
    'form.viewing-form',
    'form.plots-form',
    'form.mortgage-cta-form',
    'form[action="thank-you.html"]'
  ].join(',');

  function isConfigured() {
    return /^https?:\/\//i.test(BITRIX24_WEBHOOK_URL) && BITRIX24_WEBHOOK_URL.indexOf('PASTE_') === -1;
  }

  function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function getCookie(name) {
    var escaped = name.replace(/([.$?*|{}()\[\]\\/+^])/g, '\\$1');
    var match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  function getRoistatVisit() {
    try {
      return window.roistat_visit ||
        (window.roistat && window.roistat.visit) ||
        getCookie('roistat_visit') ||
        window.localStorage.getItem('roistat_visit') ||
        '';
    } catch (error) {
      return window.roistat_visit || getCookie('roistat_visit') || '';
    }
  }

  function getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name) || '';
  }

  function getFormLabel(form) {
    var title = form.querySelector('.form-title');
    if (title && title.textContent.trim()) return title.textContent.trim();

    var button = form.querySelector('button[type="submit"], button:not([type])');
    if (button && button.textContent.trim()) return button.textContent.trim();

    if (form.classList.contains('promo-cat-form')) return 'Получить каталог домов';
    if (form.classList.contains('viewing-form')) return 'Записаться на просмотр';
    if (form.classList.contains('plots-form')) return 'Помочь с поиском участка';
    if (form.classList.contains('mortgage-cta-form')) return 'Помочь с ипотекой';

    return 'Заявка с сайта';
  }

  function getSourceDescription(form) {
    var parts = [getFormLabel(form)];

    if (form.id) parts.push('form_id=' + form.id);
    if (form.className) parts.push('form_class=' + String(form.className).trim().replace(/\s+/g, '.'));

    return parts.join(' | ');
  }

  function getFieldLabel(field) {
    if (field.name) return field.name;
    if (field.id) {
      var label = document.querySelector('label[for="' + field.id.replace(/"/g, '\\"') + '"]');
      if (label && label.textContent.trim()) return label.textContent.trim();
      return field.id;
    }
    if (field.placeholder) return field.placeholder;
    if (field.tagName.toLowerCase() === 'select' && field.options.length) {
      var firstOptionText = field.options[0].textContent.trim();
      if (firstOptionText) return firstOptionText;
    }
    return field.tagName.toLowerCase();
  }

  function getSelectedText(select) {
    var option = select.options[select.selectedIndex];
    return option ? option.textContent.trim() : select.value;
  }

  function collectExtraFields(form) {
    var lines = [];
    var fields = form.querySelectorAll('input, select, textarea');

    fields.forEach(function (field) {
      var type = String(field.type || '').toLowerCase();
      if (type === 'hidden' || type === 'submit' || type === 'button') return;
      if (field.name === 'phone' || type === 'tel') return;
      if ((type === 'checkbox' || type === 'radio') && !field.checked) return;

      var value = field.tagName.toLowerCase() === 'select' ? getSelectedText(field) : field.value;
      if (!String(value || '').trim()) return;

      lines.push(getFieldLabel(field) + ': ' + value);
    });

    return lines;
  }

  function buildLeadFields(form, phoneInput) {
    var formLabel = getFormLabel(form);
    var extraLines = collectExtraFields(form);
    var comments = [
      'Форма: ' + formLabel,
      'Страница: ' + window.location.href
    ];

    if (extraLines.length) {
      comments.push('Данные формы:');
      comments = comments.concat(extraLines);
    }

    var fields = {
      TITLE: formLabel + ' — заявка с сайта',
      NAME: 'Заявка с сайта',
      ASSIGNED_BY_ID: RESPONSIBLE_ID,
      SOURCE_ID: SOURCE_ID,
      SOURCE_DESCRIPTION: getSourceDescription(form),
      PHONE: [{ VALUE: phoneInput.value, VALUE_TYPE: 'WORK' }],
      COMMENTS: comments.join('\n'),
      UTM_SOURCE: getUrlParam('utm_source'),
      UTM_MEDIUM: getUrlParam('utm_medium'),
      UTM_CAMPAIGN: getUrlParam('utm_campaign'),
      UTM_CONTENT: getUrlParam('utm_content'),
      UTM_TERM: getUrlParam('utm_term')
    };

    var roistatVisit = getRoistatVisit();
    if (roistatVisit) fields[ROISTAT_FIELD] = String(roistatVisit);

    return fields;
  }

  function appendBitrixValue(data, prefix, value) {
    if (Array.isArray(value)) {
      value.forEach(function (item, index) {
        Object.keys(item).forEach(function (key) {
          appendBitrixValue(data, prefix + '[' + index + '][' + key + ']', item[key]);
        });
      });
      return;
    }

    if (value && typeof value === 'object') {
      Object.keys(value).forEach(function (key) {
        appendBitrixValue(data, prefix + '[' + key + ']', value[key]);
      });
      return;
    }

    if (value !== undefined && value !== null && value !== '') {
      data.append(prefix, String(value));
    }
  }

  function buildRequestBody(fields) {
    var data = new URLSearchParams();
    Object.keys(fields).forEach(function (key) {
      appendBitrixValue(data, 'fields[' + key + ']', fields[key]);
    });
    data.append('params[REGISTER_SONET_EVENT]', 'Y');
    return data;
  }

  function buildPixelUrl(fields) {
    var data = buildRequestBody(fields);
    var joiner = BITRIX24_WEBHOOK_URL.indexOf('?') === -1 ? '?' : '&';
    return BITRIX24_WEBHOOK_URL + joiner + data.toString();
  }

  function sendLeadViaPixel(fields) {
    return new Promise(function (resolve) {
      var img = new Image();
      var done = false;

      function finish() {
        if (done) return;
        done = true;
        resolve();
      }

      img.onload = finish;
      img.onerror = finish;
      img.src = buildPixelUrl(fields);
      setTimeout(finish, 1500);
    });
  }

  function setButtonLoading(button, loading) {
    if (!button) return;

    if (loading) {
      button.dataset.originalText = button.textContent;
      button.textContent = 'Отправка...';
      button.disabled = true;
      return;
    }

    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }

  function showValidationError(phoneInput) {
    alert('Пожалуйста, введите номер телефона полностью');
    if (!phoneInput) return;

    phoneInput.style.border = '2px solid red';
    phoneInput.addEventListener('focus', function () {
      phoneInput.style.border = '';
    }, { once: true });
  }

  function redirectToThanks(form) {
    var target = form.getAttribute('action') || THANK_YOU_URL;
    window.location.href = target;
  }

  function sendLead(fields) {
    if (!isConfigured()) {
      return Promise.reject(new Error('Bitrix24 webhook URL is not configured'));
    }

    var body = buildRequestBody(fields);

    if (!window.fetch) {
      return sendLeadViaPixel(fields);
    }

    return fetch(BITRIX24_WEBHOOK_URL, {
      method: 'POST',
      body: body,
      mode: 'no-cors',
      keepalive: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      }
    }).catch(function (error) {
      console.warn('Bitrix24 POST request failed, trying pixel fallback', error);
      return sendLeadViaPixel(fields);
    });
  }

  function handleSubmit(event) {
    var form = event.target;
    if (!form || !form.matches || !form.matches(FORM_SELECTOR)) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }

    var phoneInput = form.querySelector('input[name="phone"], input[type="tel"]');
    if (!phoneInput || digitsOnly(phoneInput.value).length < 11) {
      showValidationError(phoneInput);
      return false;
    }

    var button = form.querySelector('button[type="submit"], button:not([type])');
    var fields = buildLeadFields(form, phoneInput);
    setButtonLoading(button, true);

    sendLead(fields)
      .catch(function (error) {
        console.error(error.message || error);
        alert('Интеграция с Bitrix24 не настроена: укажите реальный URL вебхука в файле bitrix24-integration.js');
      })
      .finally(function () {
        setTimeout(function () {
          redirectToThanks(form);
        }, 500);
      });

    return false;
  }

  window.submitForm = handleSubmit;
  document.addEventListener('submit', handleSubmit, true);
})();