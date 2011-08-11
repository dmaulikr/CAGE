new tool('Gifter');

tools['Gifter'].runtime = {};

tools['Gifter'].update = function() {

	tools['Gifter'].runtime['sendGiftTo'] = item.get('CAGEsendGiftTo', new Array());
	if (tools['Gifter'].runtime['sendGiftTo'].length == 0) {
		tools['Gifter'].runtime['sendGiftTo'] = [];
	}
	if(tools['Gifter'].runtime['sendGiftTo'].indexOf(',') !== -1) {
		tools['Gifter'].runtime['sendGiftTo'] = tools['Gifter'].runtime['sendGiftTo'].split(',');
	} else {
		tools['Gifter'].runtime['sendGiftTo'] = $.makeArray(tools['Gifter'].runtime['sendGiftTo']);
	}
	tools['Gifter'].runtime['requests'] = [];

	//prepare update event to receive userids and request ids
	customEvent('GiftRequests', function() {

		var _gifts = JSON.parse($('#GiftRequests').val());
		if(_gifts) {
			$.each(_gifts.data, function(_i, _e) {
				if($.inArray(_e.from.id, tools['Gifter'].runtime['sendGiftTo']) == -1) {
					tools['Gifter'].runtime['sendGiftTo'].push(_e.from.id);
				}
				tools['Gifter'].runtime['requests'].push(_e.id);
			});
			item.set('CAGEsendGiftTo', tools['Gifter'].runtime['sendGiftTo'].join(','));
		}
		tools['Gifter'].work();
	});
	addFunction( function() {
		FB.api('/me/apprequests/', function (_response) {
			fireGiftRequests(JSON.stringify(_response));
		}	);
	}, null, true, true);
};
tools['Gifter'].start = function () {
	tools['Gifter'].update();
};
tools['Gifter'].work = function () {

	if(tools['Gifter'].runtime['requests'].length > 0) {
		$.get('index.php?request_ids=' + tools['Gifter'].runtime['requests'].join(',') + '&signed_request=' + $('#signed_request').val(), function(_data) {
			tools['Gifter'].done();
		});
	} else {
		tools['Gifter'].done();
	}
};
tools['Gifter'].done = function () {
	tools['Gifter'].fbButton.enable();
};
tools['Gifter'].init = function () {
	tools['Gifter'].fbButton.add(chrome.i18n.getMessage("buttonGifter"), function () {
		tools['Gifter'].fbButton.disable();
		tools['Gifter'].start();
	});
	tools['Gifter'].newRequestForm();
};
tools['Gifter'].newRequestForm = function () {

	addFunction( function(_giftData) {

		window['showRequestForm'] = function(tit, msg, track, request_params) {

			var _ui = {
				method: 'apprequests',
				message: msg,
				data: track,
				title: tit,
				filters: ['app_users','all','app_non_users']
			};

			if(localStorage[FB._session.uid + '_' + 'CAGEsendGiftTo'] !== undefined && localStorage[FB._session.uid + '_' + 'CAGEsendGiftTo'].length !== 0) {
				_ui.filters = [{
					name: 'CAGE',
					user_ids: localStorage[FB._session.uid + '_' + 'CAGEsendGiftTo'].split(',')
				},
				'app_users',
				'all',
				'app_non_users'
				];
			}

			FB.ui(_ui, function(result) {

				// fixes infinite looping for popup window if u close it before it is done loading
				$('.fb_dialog_iframe').each( function() {
					$(this).remove();
				});
				if (result && result.request_ids) {

					var request_id_string = String(result.request_ids);
					var request_id_array = request_id_string.split(',');
					var request_id_count = request_id_array.length;

					// get all ids from sent gifts and remove them from the list
					if(localStorage[FB._session.uid + '_' + 'CAGEsendGiftTo'] !== undefined) {
						var ids = result.request_ids;
						var _batch = [];
						for (var i = 0; i < ids.length; i++) {
							_batch.push({
								"method": "get",
								"relative_url": ids[i]
							});
						}
						if (_batch.length > 0) {
							FB.api('/', 'POST', {
								batch: _batch
							}, function (res) {
								var _store = localStorage[FB._session.uid + '_' + 'CAGEsendGiftTo'].split(',');
								for (var j = 0; j < res.length; j++) {
									body = res[j].body;
									var myObject = eval('(' + body + ')');
									if(_store.indexOf(myObject.to.id) > -1) {
										_store.splice(_store.indexOf(myObject.to.id),1);
									}
								}
								if (_store.length > 0) {
									localStorage[FB._session.uid + '_' + 'CAGEsendGiftTo'] = _store.join(',');
								} else {
									console.log('clear');
									localStorage.removeItem(FB._session.uid + '_' + 'CAGEsendGiftTo');
								}
							});
						}
					}

					var params = 'ajax=1';
					params += '&signed_request=' + $('#signed_request').val();
					$.ajax({
						url: 'request_handler.php?'+request_params+'&request_ids='+result.request_ids,
						context: document.body,
						data: params,
						type: 'POST',
						success: function(data) {
							var return_message = request_id_count + ' request' + (request_id_count == 1 ? '' : 's') + ' sent!';
							document.getElementById('results_container').innerHTML = return_message;
							FB.XFBML.parse(document.getElementById('results_container'));
							$('#results_container').show();
						}
					}
					);
				}
			}
			);
		}
	}, null, true, true);
};