// Copyright (c) 2017-2024 John Seamons, ZL4VO/KF6VO

var noise_blank = {
   algo: 0,
   algo_s: [ '(none)', 'standard', 'Wild algo' ],
   menu_s: [ 'off', 'std', 'Wild' ],
   width: 400,
   height: [ 185, 310, 350 ],
   
   NB_OFF: 0,
   blanker: 0,
   test: 0,
   test_s: [ 'test off', 'test on: pre filter (std)', 'test on: post filter (Wild)' ],
   test_gain: 0,
   test_width: 1,
   wf: 1,
   
   // type
   NB_BLANKER: 0,
   NB_WF: 1,
   NB_CLICK: 2,

   NB_NONE: 0,

   NB_STD: 1,
   gate: 100,
   threshold: 50,
   
   NB_WILD: 2,
   thresh: 0.95,
   taps: 10,
   impulse_samples: 7,     // must be odd
};

function noise_blank_view()
{
   keyboard_shortcut_nav('audio');
   var total = w3_el('id-optbar-audio').clientHeight;
   var Hopt = kiwi.OPTBAR_CONTENT_HEIGHT;
   var hr = 27;   // margins=12 border=3
   var audio = w3_el('id-audio-content').clientHeight;
   var nb = w3_el('id-nblank-more').clientHeight;
   var nf = w3_el('id-nfilter-more').clientHeight;
   var test = w3_el('id-ntest-more').clientHeight;
   var Hnb = total - (audio + hr);
   pct = w3_clamp(kiwi_round(1 - (Hnb - Hopt) / (total - Hopt), 2), 0, 1);
   //console_nv('noise_blank view', {total}, {audio}, {nb}, {nf}, {test}, {Hnb}, {pct});
   w3_scrollTo('id-optbar-content', pct);
}

function noise_blank_controls_refresh()
{
   var s = '';
   
   if (noise_blank.algo != noise_blank.NB_NONE)
      s = w3_checkbox('w3-margin-B-8/w3-label-inline w3-label-not-bold w3-text-css-orange/', 'Waterfall std blanker', 'noise_blank.wf', noise_blank.wf, 'noise_blank_wf_cb');
   
   switch (noise_blank.algo) {
   
   case noise_blank.NB_STD:
      s +=
         w3_slider('', 'Gate', 'noise_blank.gate', noise_blank.gate, 100, 5000, 100, 'noise_blank_gate_cb') +
         w3_slider('', 'Threshold', 'noise_blank.threshold', noise_blank.threshold, 0, 100, 1, 'noise_blank_threshold_cb');
      break;
   
   case noise_blank.NB_WILD:
      if (ext_is_IQ_or_stereo_curmode())
         s += 'No Wild algorithm blanking in IQ or stereo modes';
      else
         s +=
            w3_slider('', 'Threshold', 'noise_blank.thresh', noise_blank.thresh, 0.05, 3, 0.05, 'noise_blank_thresh_cb') +
            w3_slider('', 'Taps', 'noise_blank.taps', noise_blank.taps, 6, 40, 1, 'noise_blank_taps_cb') +
            w3_slider('', 'Samples', 'noise_blank.impulse_samples', noise_blank.impulse_samples, 3, 41, 2, 'noise_blank_impulse_samples_cb');
      break;
   }
   
	var controls_html =
		w3_div('id-noise-blanker-controls w3-margin-right w3-text-white',
			w3_divs('/w3-tspace-8',
				w3_inline('w3-gap-16/',
				   w3_div('w3-text-aqua', '<b>Noise blanker</b>'),
               w3_select('w3-text-red||title="noise blanker selection"', '', 'type', 'nb_algo', noise_blank.algo, noise_blank.menu_s, 'nb_algo_cb', 'm'),
				   w3_button('w3-padding-tiny w3-yellow', 'Defaults', 'noise_blank_load_defaults'),
               w3_button('id-noise-blanker-help-btn w3-btn-right w3-green w3-small w3-padding-small', 'help', 'noise_blank_help')
				),
            w3_div('w3-margin-LR-16', s)
			)
		);
	
   w3_innerHTML('id-nblank-more', controls_html);

	var test_html =
		w3_div('id-noise-blanker-controls w3-text-white',
			w3_divs('w3-margin-B-8/w3-tspace-8 w3-margin-right',
				w3_inline('',
				   w3_div('w3-text-aqua', '<b>Noise blanker test</b>')
				),
				w3_div('w3-margin-LR-16',
               w3_select('w3-margin-B-8 w3-text-red', '', 'test mode', 'noise_blank.test', noise_blank.test, noise_blank.test_s, 'noise_blank_test_cb'),
               w3_slider('', 'Test pulse gain', 'noise_blank.test_gain', noise_blank.test_gain, -90, 0, 1, 'noise_blank_test_gain_cb'),
               w3_slider('', 'Test pulse width', 'noise_blank.test_width', noise_blank.test_width, 1, 30, 1, 'noise_blank_test_width_cb')
            )
         )
      );

   w3_innerHTML('id-ntest-more', test_html);
}

function noise_blank_environment_changed(changed)
{
   if (changed.mode) {
      var is_IQ_or_stereo_mode = ext_is_IQ_or_stereo_curmode();
      if (is_IQ_or_stereo_mode != noise_blank.is_IQ_or_stereo_mode) {
         noise_blank_controls_refresh();
         noise_blank.is_IQ_or_stereo_mode = is_IQ_or_stereo_mode;
      }
   }
}

// called from main ui, not ext
function noise_blank_init()
{
	// NB_STD
	noise_blank.gate = +kiwi_storeInit('last_noiseGate', cfg.nb_gate);
	noise_blank.threshold = +kiwi_storeInit('last_noiseThresh', cfg.nb_thresh);
	
	// NB_WILD
	noise_blank.thresh = +kiwi_storeInit('last_noiseThresh2', cfg.nb_thresh2);
	noise_blank.taps = +kiwi_storeInit('last_noiseTaps', cfg.nb_taps);
	noise_blank.impulse_samples = +kiwi_storeInit('last_noiseSamps', cfg.nb_samps);
	
	noise_blank.wf = +kiwi_storeInit('last_nb_wf', cfg.nb_wf);
	noise_blank.algo = +kiwi_storeInit('last_nb_algo', cfg.nb_algo);
	nb_algo_cb('nb_algo', noise_blank.algo, false, 'i');
}

function noise_blank_load_defaults()
{
	// NB_STD
   noise_blank.gate = cfg.nb_gate;
   noise_blank.threshold = cfg.nb_thresh;

	// NB_WILD
   noise_blank.thresh = cfg.nb_thresh2;
   noise_blank.taps = cfg.nb_taps;
   noise_blank.impulse_samples = cfg.nb_samps;

   noise_blank.wf = cfg.nb_wf;
   noise_blank.algo = cfg.nb_algo;
   nb_algo_cb('nb_algo', noise_blank.algo, false, 'd');
}

// called from right-click menu
function noise_blank_save_defaults()
{
	// NB_STD
   cfg.nb_gate = noise_blank.gate;
   cfg.nb_thresh = noise_blank.threshold;

	// NB_WILD
   cfg.nb_thresh2 = noise_blank.thresh;
   cfg.nb_taps = noise_blank.taps;
   cfg.nb_samps = noise_blank.impulse_samples;

   cfg.nb_wf = noise_blank.wf;
   ext_set_cfg_param('cfg.nb_algo', noise_blank.algo, EXT_SAVE);
}

// Don't have multiple simultaneous types, like the noise filter, to handle.
// Called even for parameter changes as they also need to be passed to WF.
function noise_blank_send()
{
   snd_send('SET nb algo='+ noise_blank.algo);

   if (noise_blank.algo == noise_blank.NB_STD) {
      snd_send('SET nb type=0 param=0 pval='+ noise_blank.gate);
      snd_send('SET nb type=0 param=1 pval='+ noise_blank.threshold);
   } else
   if (noise_blank.algo == noise_blank.NB_WILD) {
      snd_send('SET nb type=0 param=0 pval='+ noise_blank.thresh);
      snd_send('SET nb type=0 param=1 pval='+ noise_blank.taps);
      snd_send('SET nb type=0 param=2 pval='+ noise_blank.impulse_samples);
   }
   snd_send('SET nb type=0 en='+ (noise_blank.algo? 1:0));

   snd_send('SET nb type=1 en='+ noise_blank.wf);

   if (noise_blank.test) {
      snd_send('SET nb type=2 param=0 pval='+ Math.pow(10, noise_blank.test_gain/20));
      snd_send('SET nb type=2 param=1 pval='+ noise_blank.test_width);
   }
   snd_send('SET nb type=2 en='+ noise_blank.test);
}

function nb_algo_cb(path, idx, first, from)
{
   //console.log('nb_algo_cb path='+ path +' idx='+ idx +' first='+ first +' from='+ from);
   if (first) return;      // because call via main ui has zero, not restored value
   idx = +idx;
   w3_select_value(path, idx, { all:1 });
   noise_blank.algo = idx;
   kiwi_storeWrite('last_nb_algo', idx.toString());
   noise_blank_send();
   noise_blank_controls_refresh();
   
   // bring blanker controls into view if menu is anything except "off"
   if (idx > 0 && from == 'm')
      noise_blank_view();
}

function noise_blank_test_cb(path, idx, first)
{
   if (first) return;
   noise_blank.test = +idx;
   noise_blank_send();
}

function noise_blank_test_gain_cb(path, val, complete, first)
{
   val = +val;
	w3_num_cb(path, val);
	w3_set_label('Test pulse gain: '+ val.toFixed(0) +' dB', path);
	if (complete && !first) noise_blank_send();
}

function noise_blank_test_width_cb(path, val, complete, first)
{
   val = +val;
	w3_num_cb(path, val);
	w3_set_label('Test pulse width: '+ val.toFixed(0) +' samples', path);
	if (complete && !first) noise_blank_send();
}

function noise_blank_wf_cb(path, checked, first)
{
   if (first) return;
   noise_blank.wf = checked? 1:0;
   kiwi_storeWrite('last_nb_wf', noise_blank.wf.toString());
   noise_blank_send();
}


// NB_STD

function noise_blank_gate_cb(path, val, complete, first)
{
   val = +val;
	w3_num_cb(path, val);
	w3_set_label('Gate: '+ val.toFixed(0) +' usec', path);

	if (complete) {
	   kiwi_storeWrite('last_noiseGate', val.toString());
      if (!first) noise_blank_send();
	}
}

function noise_blank_threshold_cb(path, val, complete, first)
{
   val = +val;
	w3_num_cb(path, val);
	w3_set_label('Threshold: '+ val.toFixed(0) +'%', path);
	
	if (complete) {
	   kiwi_storeWrite('last_noiseThresh', val.toString());
      if (!first) noise_blank_send();
	}
}


// NB_WILD

function noise_blank_thresh_cb(path, val, complete, first)
{
   val = +val;
	w3_num_cb(path, val);
	w3_set_label('Threshold: '+ val.toFixed(2), path);
	if (complete) {
	   kiwi_storeWrite('last_noiseThresh2', val.toString());
	   if (!first) noise_blank_send();
	}
}

function noise_blank_taps_cb(path, val, complete, first)
{
   val = +val;
	w3_num_cb(path, val);
	w3_set_label('Taps: '+ val.toFixed(0), path);
	if (complete) {
	   kiwi_storeWrite('last_noiseTaps', val.toString());
	   if (!first) noise_blank_send();
	}
}

function noise_blank_impulse_samples_cb(path, val, complete, first)
{
   val = +val;
	w3_num_cb(path, val);
	w3_set_label('Impulse samples: '+ val.toFixed(0), path);
	if (complete) {
	   kiwi_storeWrite('last_noiseSamps', val.toString());
	   if (!first) noise_blank_send();
	}
}

function noise_blank_help()
{
   var s = 
      w3_text('w3-medium w3-bold w3-text-aqua', 'Noise blanker help') +
      w3_div('w3-margin-T-8 w3-scroll-y|height:90%',
         w3_div('w3-margin-R-8 w3-margin-bottom',
            'To be supplied...'
         )
      );
   confirmation_show_content(s, 600, 300);
   w3_el('id-confirmation-container').style.height = '100%';   // to get the w3-scroll-y above to work
}
