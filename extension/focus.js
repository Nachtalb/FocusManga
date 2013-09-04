var hoster = getHoster();


FocusManga = new function() {
  this.options;
  this.timer;
  this.img_w;
  this.img_h;

  // overlay html
  this.overlay = $('\
    <div id="fm_overlay">\
      <div id="fm_progress"></div>\
      <img id="fm_close" />\
      <a id="fm_imgnext">\
        <img id="fm_main" />\
      </a>\
      <span id="fm_info" />\
      <div id="fm_tools">\
        <img id="fm_play">\
        <img id="fm_options">\
      </div>\
    </div>');
  $('#fm_close', this.overlay).attr('src', chrome.extension.getURL('img/close-circle.png'));
  $('#fm_options', this.overlay).attr('src', chrome.extension.getURL('img/options.png'));

  // setup everything
  $('body').ready(function() {FocusManga.onready();});
  this.onready = function() {
    $('body').show();

    // check if it really is a manga page
    if (!FocusManga.isMangaPage()) return;

    // show page action
    chrome.extension.sendRequest({'method': 'pageAction'}, function(response) {});
    
    // add overlay
    $('body').prepend(FocusManga.overlay);
    
    // check if timer is supported
    if (!FocusManga.hasNextPage())
      $('#fm_tools', FocusManga.overlay).addClass('fm_disabled');

    // add listener for page action message
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      FocusManga.onPageAction();
    });

    // add listener for image load
    $('#fm_main', FocusManga.overlay).load(function() {
      FocusManga.onImgLoad(this);
    });

    // load image
    FocusManga.setImage();
  
    // add handler for window resize
    $(window).resize(function() {
      FocusManga.onResize();
    });

    // on close overlay
    $('#fm_close').click(function() {
      FocusManga.onClose();
    });

    // timer
    chrome.extension.sendRequest({'method': 'options'}, function(response) {
      FocusManga.options = response;
      FocusManga.onOptions();
    });
  
    // toggle timer/img
    $('#fm_play').click(function() {
      if (FocusManga.timer.isActive) {
        chrome.extension.sendRequest({'method': 'timer_enabled', 'data': false}, function(response) {});
        FocusManga.timer.stop();
        console.log('stopped timer');
        FocusManga.updateTimerIcon(false);
      } else {
        // start timer
        chrome.extension.sendRequest({'method': 'timer_enabled', 'data': true}, function(response) {});
        FocusManga.timer.once(0);
        console.log('started timer');
        FocusManga.updateTimerIcon(true);
      }
    });

    // options page
    $('#fm_options', FocusManga.overlay).click(function() {
      chrome.extension.sendRequest({'method': 'tabs'}, function(response) {});
    });
  }

  this.updateTimerIcon = function(timer_enabled) {
    if (timer_enabled) {
      $('#fm_play', FocusManga.overlay).attr('src', chrome.extension.getURL('img/stop.png'));
    } else {
      $('#fm_play', FocusManga.overlay).attr('src', chrome.extension.getURL('img/play.png'));
    }
  }

  this.onPageAction = function() {
    $('html').toggleClass('fm_enabled');
  }

  this.onImgLoad = function(img) {
    FocusManga.img_w = img.width;
    FocusManga.img_h = img.height;
    $(window).resize();
  }

  this.onResize = function() {
    if (FocusManga.img_w / FocusManga.img_h < $(window).width() / $(window).height()) {
      $('#fm_main', FocusManga.overlay).removeClass('landscape');
    } else {
      $('#fm_main', FocusManga.overlay).addClass('landscape');
    }
  }

  this.onClose = function() {
    chrome.extension.sendRequest({'method': 'focusmanga_enabled', 'data': false}, function(response) {});
    $('html').removeClass('fm_enabled');
  }

  this.onOptions = function() {
    // check if focusmanga is active
    if (FocusManga.options.focusmanga_enabled) $('html').addClass('fm_enabled');

    if(!isNaN(hoster.currPage()) && !isNaN(hoster.totalPages())) {
      if (FocusManga.options.page_numbers_enabled)
        $('#fm_info', FocusManga.overlay).show().text(FocusManga.currentPageNumber()+" / "+FocusManga.currentChapterPages());
      if (FocusManga.options.chapter_progressbar_enabled)
        $('#fm_progress', FocusManga.overlay)
          .css('width', Math.round(FocusManga.currentPageNumber() / FocusManga.currentChapterPages() * 100)+"%");
    }

    // timer
    if (FocusManga.hasNextPage) {
      $('#fm_imgnext', FocusManga.overlay).attr('href', "#").click(function() {
        FocusManga.next();
      });
      FocusManga.timer = $.timer(function() {
        if (!FocusManga.options.focusmanga_enabled) return;
        console.log('execute timer');
        FocusManga.next();
      }, FocusManga.options.timer_delay * 1000, FocusManga.options.timer_enabled);
      FocusManga.updateTimerIcon(FocusManga.options.timer_enabled);
    }
  }

  //// OVERRIDE ////
  this.isMangaPage = function() {return false;}
  this.hasNextPage = function() {return false;}
  this.setImage = function() {}
  this.currentPageNumber = function() {}
  this.currentChapterPages = function() {}
  this.preload = function() {}
  this.next = function() {}
}

FocusManga.isMangaPage = function() {return hoster.isMangaPage();}
FocusManga.hasNextPage = function() {return hoster.nextUrl;}
FocusManga.next = function() {window.location.href = hoster.nextUrl();}
FocusManga.setImage = function() {$('#fm_main', FocusManga.overlay).attr('src', hoster.imgUrl());}
FocusManga.currentPageNumber = function() {return hoster.currPage();}
FocusManga.currentChapterPages = function() {return hoster.totalPages();}
FocusManga.preload = function() {
    $('head').append(
        $('<link rel="prerender" />').attr('src', hoster.nextUrl())
    );
}
