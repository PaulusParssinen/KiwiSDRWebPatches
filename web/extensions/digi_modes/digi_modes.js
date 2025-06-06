// Copyright (c) 2023 John Seamons, ZL4VO/KF6VO

var digi = {
   ext_name: 'digi_modes',    // NB: must match digi_modes.cpp:digi_ext.name
   first_time: true,
   
   callsign: '',
   grid: '',
   
   mode: 1,
   MFSK32: 0,
   MFSK64: 1,
   mode_s: ['MFSK32', 'MFSK64'],

   freq_s: {
      'FT8': [ '1840', '3573', '5357', '7074', '10136', '14074', '18100', '21074', '24915', '28074' ],
      'FT4': [ '3575.5', '7047.5', '10140', '14080', '18104', '21140', '24919', '28180' ]
   },
   PASSBAND_LO: 100,
   PASSBAND_HI: 3100,

   // must set "remove_returns" so output lines with \r\n (instead of \n alone) don't produce double spacing
   console_status_msg_p: {
      no_decode: true, scroll_only_at_bottom: true, process_return_alone: false, remove_returns: true,
      cols: 135, max_lines: 1024
   },

   log_mins: 0,
   log_interval: null,
   log_txt: '',

   last_last: 0
};

function digi_modes_main()
{
	ext_switch_to_client(digi.ext_name, digi.first_time, digi_recv);   // tell server to use us (again)
	if (!digi.first_time)
		digi_controls_setup();
	digi.first_time = false;
}

function digi_recv(data)
{
	var firstChars = arrayBufferToStringLen(data, 3);
	
	// process data sent from server/C by ext_send_msg_data()
	if (firstChars == "DAT") {
		var ba = new Uint8Array(data, 4);
		var cmd = ba[0];
		var o = 1;
		var len = ba.length-1;

		console.log('digi_recv: DATA UNKNOWN cmd='+ cmd +' len='+ len);
		return;
	}
	
	// process command sent from server/C by ext_send_msg() or ext_send_msg_encoded()
	var stringData = arrayBufferToString(data);
	var params = stringData.substring(4).split(" ");

	for (var i=0; i < params.length; i++) {
		var param = params[i].split("=");

		if (0 && param[0] != "keepalive") {
			if (isDefined(param[1]))
				console.log('digi_recv: '+ param[0] +'='+ param[1]);
			else
				console.log('digi_recv: '+ param[0]);
		}

		switch (param[0]) {

			case "ready":
				digi_controls_setup();
				break;

			case "chars":
				digi_output_chars(param[1]);
				break;

			case "debug":
            if (dbgUs) console.log(kiwi_decodeURIComponent('digi', param[1]));
				break;

			default:
				console.log('digi_recv: UNKNOWN CMD '+ param[0]);
				break;
		}
	}
}

function digi_output_chars(c)
{
   c = kiwi_decodeURIComponent('digi', c);    // NB: already encoded on C-side
   //console.log('digi_output_chars <'+ c +'>');
   //digi.log_txt += kiwi_remove_escape_sequences(c);

   var a = c.split('');
   a.forEach(function(ch, i) {
      if (ch == '<') a[i] = kiwi.esc_lt;
      else
      if (ch == '>') a[i] = kiwi.esc_gt;
   });
   digi.console_status_msg_p.s = a.join('');
   //console.log(digi.console_status_msg_p);
   kiwi_output_msg('id-digi-console-msgs', 'id-digi-console-msg', digi.console_status_msg_p);
}

function digi_controls_setup()
{
	digi.saved_setup = ext_save_setup();
   ext_tune(null, 'usb', ext_zoom.ABS, 11, digi.PASSBAND_LO, digi.PASSBAND_HI);

   var data_html =
      time_display_html('digi') +
      
      w3_div('id-digi-data|left:150px; width:1044px; height:300px; overflow:hidden; position:relative; background-color:mediumBlue;',
			w3_div('id-digi-console-msg w3-text-output w3-scroll-down w3-small w3-text-black|width:1024px; height:300px; position:absolute; overflow-x:hidden;',
			   w3_code('id-digi-console-msgs/')
			)
      );
   
	var controls_html =
		w3_div('id-digi-controls w3-text-white',
			w3_divs('',
            w3_col_percent('w3-valign/',
               w3_div('',
				      w3_div('w3-medium w3-text-aqua', '<b>Digital modes decoder</b>')
				   ), 40,
					w3_div('', 'From <b><a href="https://sourceforge.net/p/fldigi/wiki/Home/" target="_blank">fldigi</a></b> by Dave, W1HKJ et al.'), 45
				),
				w3_div('id-digi-err w3-margin-T-10 w3-padding-small w3-css-yellow w3-width-fit w3-hide'),
				w3_inline('id-digi-container w3-margin-T-6/w3-margin-between-16',

               w3_div('',
                  w3_inline('/w3-margin-between-16',
                     w3_select_hier('id-digi-freq w3-text-red w3-width-auto', '', 'freq', 'digi.freq_idx', -1, digi.freq_s, 'digi_freq_cb'),
                     w3_select('w3-text-red', '', 'mode', 'digi.mode', digi.mode, digi.mode_s, 'digi_mode_cb')
                  )
               ),

               w3_button('w3-padding-smaller w3-css-yellow', 'Clear', 'digi_clear_button_cb'),
               (dbgUs? w3_button('w3-padding-smaller w3-aqua', 'Test', 'digi_test_cb') : '')
            )
			)
		);
	
	ext_panel_show(controls_html, data_html, null);
	time_display_setup('digi');

   ext_set_data_height(300);
	ext_set_controls_width_height(525, 90);
   digi_clear_button_cb();

	ext_send('SET digi_start');

	digi.url_params = ext_param();
	var p = digi.url_params;
   if (p) {
      p = p.split(',');
      var do_test = 0;
      p.forEach(function(a, i) {
         if (w3_ext_param('test', a).match) {
            do_test = 1;
         }
         if (w3_ext_param('help', a).match) {
            ext_help_click();
         }
      });

      // check first URL param matching entry in the freq menu
      var found = false;
      var freq = parseFloat(digi.url_params);
      if (!isNaN(freq)) {
         w3_select_enum('id-digi-freq', function(option) {
            //console.log('CONSIDER '+ parseFloat(option.innerHTML));
            if (!found && parseFloat(option.innerHTML) == freq) {
               digi_freq_cb('id-digi-freq', option.value, false);
               found = true;
            }
         });
      }

      if (dbgUs && do_test) digi_test_cb();
   }
}

function digi_freq_cb(path, idx, first)
{
	if (first) return;
   idx = +idx;
	var menu_item = w3_select_get_value('id-digi-freq', idx);
	var freq = +(menu_item.option);
   ext_tune(freq, 'usb', ext_zoom.ABS, 11);
   var mode = menu_item.last_disabled;
   w3_select_value(path, idx);   // for benefit of direct callers
	console.log('digi_freq_cb: path='+ path +' idx='+ idx +' freq='+ freq +' mode='+ mode);
	
	if (mode != digi.mode_s[digi.mode]) {
	   digi.mode ^= 1;
	   digi_mode_cb('digi.mode', digi.mode);
	   console.log('digi_freq_cb: changing mode to '+ digi.mode);
	}
}

function digi_mode_cb(path, idx, first)
{
	if (first) return;
	console.log('digi_mode_cb: idx='+ idx);
   idx = +idx;
	w3_set_value(path, idx);
}

function digi_clear_button_cb(path, idx, first)
{
   if (first) return;
   digi.console_status_msg_p.s = '\f';
   kiwi_output_msg('id-digi-console-msgs', 'id-digi-console-msg', digi.console_status_msg_p);
   digi.log_txt = '';
}

function digi_test_cb()
{
   console.log('digi_test');
   ext_send('SET digi_test');
}

// called to display HTML for configuration parameters in admin interface
function digi_modes_config_html()
{
   ext_config_html(digi, 'digi_modes', 'digi modes', 'Digital modes configuration', '');
}

function digi_modes_blur()
{
	ext_set_data_height();     // restore default height
	ext_restore_setup(digi.saved_setup);
	ext_send('SET digi_close');
   kiwi_clearInterval(digi.log_interval);
}

function digi_modes_help(show)
{
   if (show) {
      var s = 
         w3_text('w3-medium w3-bold w3-text-aqua', 'Digital modes decoder help') +
         w3_div('w3-margin-T-8 w3-scroll-y|height:90%',
            w3_div('w3-margin-R-8 w3-margin-bottom',
               'To be supplied...'
            )
         );
      confirmation_show_content(s, 600, 300);
      w3_el('id-confirmation-container').style.height = '100%';   // to get the w3-scroll-y above to work
   }
   return true;
}
