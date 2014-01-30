(function($) {
	var BET_MIN = 0;
	var BET_MAX = 10;

	//model
	var Board = (function() {
		var TABLE_WIDTH = 12;
		var TABLE_HEIGHT = 3;

		var NUMBER_MIN = 0;
		var NUMBER_MAX = 36;

		var simulation = {
			totalBet: 0,
			expectedValue: 0,
			oddsToWinPlus: 0,
			oddsToWinMinus: 0,
			oddsToLose: 0,
			min: 0,
			max: 0,
			result: [],
			distribution: []
		};

		var rate = 10;

		var spot = {};
		var BetSpot = function(affect, payout) {
			this.affect = affect;
			this.payout = payout;
			this.bet = 0;
		};
		BetSpot.prototype.setBet = function(bet, callback) {
			if(bet < BET_MIN || bet > BET_MAX) return;
			this.bet = bet;

			if(callback !== undefined)
				callback(this);
		};
		BetSpot.prototype.increaseBet = function() {
			if(this.bet == BET_MAX)
				this.setBet(BET_MIN);
			else
				this.setBet(this.bet + 1);
		};
		BetSpot.prototype.decreaseBet = function() {
			if(this.bet == BET_MIN)
				this.setBet(BET_MAX);
			else
				this.setBet(this.bet - 1);
		};
		BetSpot.prototype.getResult = function() {
			return this.bet * this.payout;
		};

		//init
		(function() {
			var i;

			spot[0] = new BetSpot([0], 0);

			var table = [];
			var row, col;

			for(row = 0; row < TABLE_HEIGHT; row++) {
				table.push([]);
				var line = [];

				for(col = 0; col < TABLE_WIDTH; col++) {
					var num = col * TABLE_HEIGHT + row + 1;
					table[row][col] = num;

					//1目
					spot[num] = new BetSpot([num], 36);

					line.push(num);
				}

				//横一列
				spot['row-' + row.toString()] = new BetSpot(line, 3);
			}

			var isLastRow, isLastCol;

			for(row = 0; row < TABLE_HEIGHT; row++) {
				isLastRow = (row == TABLE_HEIGHT - 1);

				for(col = 0; col < TABLE_WIDTH; col++) {
					isLastCol = (col == TABLE_WIDTH - 1);

					var current = table[row][col];
					var horizontal, vertical, square;

					if(!isLastCol) {
						horizontal = [current, table[row][col + 1]];

						//横2目
						spot[horizontal.join('-')] = new BetSpot(horizontal, 18);
					}
					if(!isLastRow) {
						vertical = [current, table[row + 1][col]];
						
						//縦2目
						spot[vertical.join('-')] = new BetSpot(vertical, 18);
					}
					if(!isLastCol && !isLastRow) {
						square = [current, table[row + 1][col], table[row][col + 1], table[row + 1][col + 1]];
						
						//4目
						spot[square.join('-')] = new BetSpot(square, 9);
					}
				}
			}

			for(col = 0; col < TABLE_WIDTH; col++) {
				var street = [];
				var six = [];
				isLastCol = (col == TABLE_WIDTH - 1);

				for(row = 0; row < TABLE_HEIGHT; row++) {
					street.push(table[row][col]);
					if(!isLastCol) six.push(table[row][col]);
				}
				if(!isLastCol)
					for(row = 0; row < TABLE_HEIGHT; row++)
						six.push(table[row][col + 1]);

				//3目（縦1列）
				spot[street.join('-')] = new BetSpot(street, 12);
				if(!isLastCol)
					//6目（縦2列）
					spot[six.join('-')] = new BetSpot(six, 6);
			}

			var div;
			for(div = 0; div < 3; div++) {
				var dozen = [];
				for(i = 0; i < 12; i++)
					dozen.push(div * 12 + i + 1);

				//12目
				spot[dozen[0] + '-' + dozen[dozen.length - 1]] = new BetSpot(dozen, 3);
			}

			for(div = 0; div < 2; div++) {
				var half = [];
				for(i = 0; i < 18; i++)
					half.push(div * 18 + i + 1);

				//前後半18目
				spot[div === 0 ? 'first-half' : 'second-half'] = new BetSpot(half, 2);
			}

			var even = [];
			var odd = [];
			for(i = 0; i < TABLE_WIDTH * TABLE_HEIGHT; i += 2) {
				odd.push(i + 1);
				even.push(i + 2);
			}
			//奇数
			spot['odd'] = new BetSpot(odd, 2);
			//偶数
			spot['even'] = new BetSpot(even, 2);

			var red = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
			var blue = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
			//赤マス
			spot['red'] = new BetSpot(red, 2);
			//青マス
			spot['blue'] = new BetSpot(blue, 2);

			for(var id in spot)
				spot[id].bet = 0;
		})();

		function clearBet() {
			for(var spotId in spot)
				spot[spotId].bet = 0;

			clearResult();
			simulate();
		}

		//シミュレーション結果格納変数の初期化
		function clearResult() {
			for(i = NUMBER_MIN; i <= NUMBER_MAX; i++)
				simulation.result[i] = 0;
		}
		function recalc() {
			clearResult();
			for(var spotId in spot) {
				var currentSpot = spot[spotId];

				for(var i = 0; i < currentSpot.affect.length; i++)
					simulation.result[currentSpot.affect[i]] += currentSpot.getResult();
			}
			simulate();
		}

		function simulate() {
			var DINOMINATOR = 37;

			var totalBet = 0;
			var expectedValue = 0;
			var winPlusCount = 0;
			var winMinusCount = 0;
			var loseCount = 0;
			var min = 0x7fffffff, max = 0;
			var distrib = [];

			//合計ベット
			for(var spotId in spot)
				totalBet += spot[spotId].bet;

			for(var i = NUMBER_MIN; i <= NUMBER_MAX; i++) {
				//勝敗カウント
				if(simulation.result[i] === 0)
					loseCount++;
				else if(simulation.result[i] >= totalBet)
					winPlusCount++;
				else
					winMinusCount++;

				//期待値
				expectedValue += simulation.result[i] / DINOMINATOR;

				//最小値
				if(simulation.result[i] < min) min = simulation.result[i];
				if(simulation.result[i] > max) max = simulation.result[i];

				//分布
				if(distrib[simulation.result[i]])
					distrib[simulation.result[i]]++;
				else
					distrib[simulation.result[i]] = 1;
			}

			var distribArr = [];
			for(i in distrib)
				distribArr.push({result: i * rate, odds: distrib[i] / DINOMINATOR});
			distribArr = distribArr.sort(function(a, b) {return a.result - b.result;});

			simulation.totalBet = totalBet * rate;
			simulation.expectedValue = expectedValue * rate;
			simulation.oddsToWinPlus = winPlusCount / DINOMINATOR;
			simulation.oddsToWinMinus = winMinusCount / DINOMINATOR;
			simulation.oddsToLose = loseCount / DINOMINATOR;
			simulation.min = min * rate;
			simulation.max = max * rate;
			simulation.distribution = distribArr;
		}

		//レート取得・変更
		function getRate() {
			return rate;
		}
		function setRate(newRate) {
			rate = newRate;
		}

		function serialize() {
			var serialArray = [];

			for(var spotId in spot)
				serialArray.push(String.fromCharCode(spot[spotId].bet));

			serialArray.push(String.fromCharCode(getRate()));

			return serialArray.join('');
		}
		function deserialize(serial) {
			var dataArray = [], i;

			for(i = 0; i < serial.length; i++)
				dataArray.push(serial.charCodeAt(i));

			i = 0;
			for(var spotId in spot) {
				spot[spotId].setBet(dataArray[i]);
				i++;
			}

			setRate(dataArray[i]);
		}

		//API
		return {
			spot: spot,
			simulation: simulation,

			//method
			recalc: recalc,
			clearBet: clearBet,
			getRate: getRate,
			setRate: setRate,
			serialize: serialize,
			deserialize: deserialize
		};
	})();

	var RouletteUI = (function($) {

		var draggingId = ''; //ドラッグ中のID保持
		var dragStartY = 0; //ドラッグ開始Y座標
		var dragStartBet = 0; //ドラッグ開始時のベット
		var isDragged = false; //mousedown後ドラッグされたフラグ
		var PIXEL_PER_BET = 3;

		function getCurrentId(currentNode) {
			return $(currentNode).attr('id').substring(2);
		}

		function clear() {
			Board.clearBet();
			refreshAll();
		}

		function refreshAll() {
			refreshAllSpots();
			Board.recalc();
			refreshResult();
			refreshSimulation();
			refreshSaveUrl();
		}

		function refreshSpot(spotId) {
			var spot = Board.spot[spotId];

			var $spotUI = $('#p-' + spotId);
			$spotUI.empty();

			var SPOT_HEIGHT = 30;
			var baseBottom = $spotUI.height() / 2 - SPOT_HEIGHT / 2;

			for(var i = 0; i < spot.bet; i++) {
				$('<div class="coin">').css({
					bottom: (baseBottom + i * PIXEL_PER_BET).toString() + 'px'
				}).appendTo($spotUI);
			}

			$spotUI.attr('title', '倍率: x' + spot.payout.toString() + '\n枚数: ' + spot.bet * Board.getRate());
		}

		function refreshAllSpots() {
			for(var spotId in Board.spot)
				refreshSpot(spotId);
		}

		function refreshResult() {
			for(var i = 0; i <= 36; i++) {
				var result = Board.simulation.result[i] * Board.getRate();
				$('#result-value-' + i.toString())
					.text(result)
					.toggleClass('affected', result > 0 && result >= Board.simulation.totalBet);
				$('#v-' + i.toString()).toggleClass('affected', result > 0);
			}
		}

		function refreshSimulation() {
			var sim = Board.simulation;

			$('#total-bet').text(sim.totalBet.toString());
			$('#expected-value').text(sim.expectedValue.toFixed(2));
			$('#odds-to-lose').text((sim.oddsToLose * 100).toFixed(2) + ' %');
			$('#odds-to-win-minus').text((sim.oddsToWinMinus * 100).toFixed(2) + ' %');
			$('#odds-to-win-plus').text((sim.oddsToWinPlus * 100).toFixed(2) + ' %');
			$('#min').text(sim.min.toString() + ' (' + getSign(sim.min - sim.totalBet) + (sim.min - sim.totalBet).toString() + ')');
			$('#max').text(sim.max.toString() + ' (' + getSign(sim.max - sim.totalBet) + (sim.max - sim.totalBet).toString() + ')');
			
			refreshDistribution();

			function refreshDistribution() {
				var sim = Board.simulation;
				var distrib = sim.distribution;
				var $distTable = $('#distribution');
				var $entRow;

				$('#distribution .dist-entry').remove();
				
				for(var i = 0; i < distrib.length; i++) {
					var diff = distrib[i].result - sim.totalBet;

					$entRow = $('<tr>').addClass('dist-entry');
					$entRow.append(
						$('<td>').addClass('dist-result').text(distrib[i].result)
					).append(
						$('<td>').addClass('dist-diff').text('(' + getSign(diff) + diff.toString() + ')')
					).append(
						$('<td>').addClass('dist-odds').text((distrib[i].odds * 100).toFixed(2) + ' %')
					);

					$distTable.append($entRow);
				}
			}

			function getSign(num) {
				if(num > 0)
					return "+";
				else if(num === 0)
					return "±";
				else
					return "";
			}
		}
	
		function refreshSaveUrl() {
			var url = window.location.href.replace(window.location.search, "") + '?' +
				Base64.btoa(RawDeflate.deflate(Board.serialize()));

			$('#url_text').val(url);
			
			var params = {
				text: 'DQ10 ルーレット配置:',
				hashtags: 'DQ10, dq10_skillsim',
				url: url,
				original_referer: window.location.href,
				tw_p: 'tweetbutton'
			};
			$('#tw-saveurl').attr('href', 'https://twitter.com/intent/tweet?' + $.param(params));
		}

		function setup() {

			$('td[id^="p-"]').mouseenter(function(e) {
				if(draggingId !== '') return false;

				var spotId = getCurrentId(this);
				var affect = Board.spot[spotId].affect;

				for(var i = 0; i < affect.length; i++) {
					$('#v-' + affect[i].toString()).toggleClass('emph', true);
					$('.result-' + affect[i].toString()).toggleClass('emph', true);
				}
			}).mouseleave(function(e) {
				if(draggingId !== '') return false;
				
				var spotId = getCurrentId(this);
				var affect = Board.spot[spotId].affect;

				for(var i = 0; i < affect.length; i++) {
					$('#v-' + affect[i].toString()).toggleClass('emph', false);
					$('.result-' + affect[i].toString()).toggleClass('emph', false);
				}
			}).attr('title', function() {
				var spotId = getCurrentId(this);
				return '倍率: x' + Board.spot[spotId].payout.toString();
			}).mousedown(function(e) {
				var spotId = getCurrentId(this);
				draggingId = spotId;
				dragStartY = e.clientY;
				dragStartBet = Board.spot[spotId].bet;
				isDragged = false;

				var hintTop = $(this).offset().top - $('#hinttooltip').height();
				var hintLeft = $(this).offset().left + $(this).width();
				$('#hinttooltip').css({top: hintTop, left: hintLeft});
			});

			$('body').mouseup(function(e) {
				if(draggingId === '') return;

				$('#hinttooltip p').text('');
				$('#hinttooltip').hide();

				if(!isDragged) {
					Board.spot[draggingId].increaseBet();
					refreshSpot(draggingId);
					Board.recalc();
					refreshResult();
					refreshSimulation();
				}
				var spotIdBuffer = draggingId;
				draggingId = '';
				$('#p-' + spotIdBuffer).mouseleave();
				isDragged = false;
			}).mousemove(function(e) {
				if(draggingId === '') return;

				isDragged = true;
				var offsetY = dragStartY - e.clientY;
				var newBet = dragStartBet + Math.round(offsetY / PIXEL_PER_BET);
				if(newBet < BET_MIN) newBet = BET_MIN;
				if(newBet > BET_MAX) newBet = BET_MAX;

				if(newBet != Board.spot[draggingId].bet) {
					Board.spot[draggingId].setBet(newBet);

					$('#hinttooltip').show();
					$('#hinttooltip p').text('枚数: ' + Board.spot[draggingId].bet * Board.getRate());

					refreshSpot(draggingId);
					Board.recalc();
					refreshResult();
					refreshSimulation();
				}
			});

			$('#clear-button').button({
				icons: { primary: 'ui-icon-refresh' },
			}).click(function(e) {
				clear();
			});

			$('#radio-rate :radio').change(function(e) {
				Board.setRate(parseInt($('#radio-rate :radio:checked').val()));

				refreshAll();
			}).val([Board.getRate()]);

			$('#url_text').click(function() {
				refreshSaveUrl();
				$(this).select();
			});

			$('#tw-saveurl').button().click(function(e) {
				var screenWidth = screen.width, screenHeight = screen.height;
				var windowWidth = 550, windowHeight = 420;
				var windowLeft = Math.round(screenWidth / 2 - windowWidth / 2);
				var windowTop = windowHeight >= screenHeight ? 0 : Math.round(screenHeight / 2 - windowHeight / 2);
				var windowParams = {
					scrollbars: 'yes',
					resizable: 'yes',
					toolbar: 'no',
					location: 'yes',
					width: windowWidth,
					height: windowHeight,
					left: windowLeft,
					top: windowTop
				};
				var windowParam = $.map(windowParams, function(val, key) { return key + '=' + val; }).join(',');
				window.open(this.href, null, windowParam);
				
				return false;
			});

			refreshAll();
		}

		//API
		return {
			setup: setup
		};

	})(jQuery);

	var Base64 = (function(global) {
		var EN_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

		var _btoa_impl = function(b) {
			return b.replace(/.{1,3}/g, function(m) {
				var bits =
					(m.charCodeAt(0) << 16) |
					(m.length > 1 ? m.charCodeAt(1) << 8 : 0) |
					(m.length > 2 ? m.charCodeAt(2) : 0);
				return [
					EN_CHAR.charAt(bits >>> 18),
					EN_CHAR.charAt((bits >>> 12) & 63),
					m.length > 1 ? EN_CHAR.charAt((bits >>> 6) & 63) : '',
					m.length > 2 ? EN_CHAR.charAt(bits & 63) : ''
				].join('');
			});
		};

		var _atob_impl = function(a) {
			return a.replace(/.{1,4}/g, function(m) {
				var bits = 0;
				for(var i = 0; i < m.length; i++) {
					bits = bits | (EN_CHAR.indexOf(m.charAt(i)) << ((3 - i) * 6));
				}
				return [
					String.fromCharCode(bits >>> 16),
					m.length > 1 ? String.fromCharCode((bits >>> 8) & 0xFF) : '',
					m.length > 2 ? String.fromCharCode(bits & 0xFF) : ''
				].join('');
			});
		};

		var btoa = global.btoa ? function(b) {
			return global.btoa(b)
				.replace(/[+\/]/g, function(m0) {return m0 == '+' ? '-' : '_';})
				.replace(/=/g, '');
		} : _btoa_impl;

		var atob = global.atob ? function(a) {
			a = a.replace(/[-_]/g, function(m0) {return m0 == '-' ? '+' : '/';});
			if(a.length % 4 == 1) a += 'A';

			return global.atob(a);
		} : _atob_impl;

		function validate(str) {
			return str.match(/^[A-Za-z0-9-_]+$/);
		}

		//API
		return {
			btoa: btoa,
			atob: atob,
			validate: validate
		};
	})(window);

	//ロード時
	jQuery(function($) {
		var query = window.location.search.substring(1);
		if(Base64.validate(query)) {
			var serial = '';

			try {
				serial = RawDeflate.inflate(Base64.atob(query));
			} catch(e) {
			}

			if(serial.length >= 152) { //バイト数が小さすぎる場合inflate失敗とみなす。
				Board.deserialize(serial);
			}
		}

		RouletteUI.setup();

		var SHARING_URL = 'http://cpro.jp/dq10/roulette/';
		$('#tw-share').socialbutton('twitter', {
			button: 'horizontal',
			url: SHARING_URL,
			lang: 'ja',
			hashtags: 'DQ10, dq10_skillsim'
		});
		$('#fb-like').socialbutton('facebook_like', {
			button: 'button_count',
			url: SHARING_URL,
			locale: 'ja_JP'
		});
		$('#g-plusone').socialbutton('google_plusone', {
			lang: 'ja',
			size: 'medium',
			url: SHARING_URL
		});
	});

})(jQuery);
