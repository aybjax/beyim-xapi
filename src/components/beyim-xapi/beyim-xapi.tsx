import { Component, Host, h, Prop } from '@stencil/core';
import {User} from './user'
import { v4 as uuid } from 'uuid';
import { Element, HTMLStencilElement } from '@stencil/core/internal';
import _ from 'lodash';

@Component({
  tag: 'beyim-xapi',
  styleUrl: 'beyim-xapi.css',
  shadow: true,
})
export class BeyimXapi {
  @Element()
  hostElement: HTMLStencilElement;  
  dox_id = uuid();
  video?: HTMLVideoElement;
  observer: IntersectionObserver|undefined;
  timeout:NodeJS.Timeout|undefined;

  static LOCAL_BACKEND_URL = 'http://local.veracity.it'

  get hostUrl() {
    if (this.type === 'video') {
      const host = this.host_url ? this.host_url : (this.video?.currentSrc ?? '');

      const url = new URL(host);
      url.searchParams.set('time', `${Math.round(this.video?.currentTime ?? 0)}s`)

      return url.href
    }

    return this.host_url ? this.host_url : window.location.href;
  }

  /** X-API stuff */
  @Prop({attribute: 'verb'})
  _verb!: string;
  _video_verb?: string

  get verb() {
    if (this.type !== 'video') {
      return this._verb
    }

    return this._video_verb ?? ''
  }
  
  @Prop({attribute: 'name'})
  name!: string;

  @Prop({attribute: 'subject'})
  subject!: string|undefined;

  @Prop({attribute: 'host'})
  host_url?: string;
  /** X-API stuff end */

  
  /** Component stuff */
  // TODO discuss with Aigerim prior to changes or updates
  @Prop({attribute: 'backend'})
  backend?: string;

  @Prop({attribute: 'type'})
  type!: 'button'|'view'|'video';

  @Prop({attribute: 'view-timeout'})
  view_timeout?: number = 10;

  @Prop({attribute: 'view-threshold'})
  view_threshold?: number = 80;

  @Prop({attribute: 'debug'})
  debug?: boolean;
  /** Component stuff end */

  get isButton() {
    return this.type === 'button'
  }

  get isVideo() {
    return this.type === 'video'
  }

  get backendUrl() {
    if(!!this.backend) return this.backend + '/beyim-lrs/xapi/';
    
    this.error('backend attribute is not set, for sending request switching to local server', BeyimXapi.LOCAL_BACKEND_URL)

    return BeyimXapi.LOCAL_BACKEND_URL;
  }

  componentDidLoad() {
    // make sure only 1 child is allowed
    if(this.hostElement.children.length != 1) {
      alert('Only 1 child element is allowed in <beyim-xapi/>')
      this.error('Only 1 child element is allowed in <beyim-xapi/>. this component will not be functional')

      return
    }

    this.applyStyle()

    if(this.type !== 'button' && this.type !== 'view' && this.type !== 'video') {
      this.error(`forgot to add 'type' attribute`)
      window.alert(`[id:${this.dox_id}] beyim-xapi element requires type attribute ('view'|'button')`)

      return
    }

    // TODO do I need to remove verb getter?
    if(!this.subject || /*!this.verb ||*/ !this.name) {
      this.error(`forgot to add 'attributes: 'subject', 'verb' or 'name'`)
      window.alert(`[id:${this.dox_id}] beyim-xapi element requires attribute 'name', 'verb', 'subject'`)
    }

    this.log(`Element is loaded`);
    if(this.isButton){
      this.log('Element is button')

      return
    }

    if(this.isVideo){
      const videoSize = this.hostElement.querySelectorAll('video')?.length ?? 0;

      if (videoSize !== 1) {
        this.error(`there should be exactly 1 video element inside beyim-xapi element`)
        window.alert(`[id:${this.dox_id}] beyim-xapi element requires exactly 1 video element inside`)
      }


      this.log('Element is video');
      this.video = this.hostElement.querySelector('video');

      this.video?.addEventListener('play', this._playListener.bind(this));
      this.video?.addEventListener('pause', this._pauseListener.bind(this));
      this.video?.addEventListener('ended', this._endedListener.bind(this));
      this.video?.addEventListener('seeked', this._seekedListener.bind(this));

      return
    }
    
    this.log('Element is view trigger')

    this.registerObserver()
  }

  disconnectedCallback() {
    this.log(`Element is disconnecting... ${this.observer ? 'disconnecting scroll listener' : ''}`);
    this.observer?.disconnect()

    this.video?.removeEventListener('play', this._playListener);
    this.video?.removeEventListener('pause', this._pauseListener);
    this.video?.removeEventListener('ended', this._endedListener);
    this.video?.removeEventListener('seeked', this._seekedListener);
  }

  render() {
    if(this.isButton) return this.renderButton();

    return this.renderView()
  }

  renderButton() {
    return (
      <Host id={this.dox_id} onClick={this.sendEvent.bind(this)}>
        <slot></slot>
      </Host>
    );
  }

  renderView() {
    // this.sendEvent()
    return (
      <Host id={this.dox_id}>
        <slot></slot>
      </Host>
    );
  }

  sendEvent() {
    const user = User.getUser();

    if (!user) return;

    if (!this.verb) return;
    
    const conf = {
      "endpoint": this.backendUrl,
      "auth": "Basic " + btoa(`${User.X_API_USERNAME}:${User.X_API_PASSWD}`),
      "X-API-KEY": `Bearer ${User.getToken}`,
    };
    //@ts-ignore
    ADL.XAPIWrapper.changeConfig(conf);
    const statement = {
      "actor": {
        "name": user.id,
        "mbox": "mailto:" + user.email 
      },
      "verb": {
        "id": `http://adlnet.gov/expapi/verbs/${this.verb}`,
        "display": { "en-US": this.verb }
      },
      "object": {
        "id": this.hostUrl ? this.hostUrl : window.location.href,
        "definition": {
          "name": { "en-US": this.name }
        }
      },
      "context": {
        "extensions": {
          [window.location.host + '/subject']: this.subject,
        }
      },
    };
    //@ts-ignore
    const result = ADL.XAPIWrapper.sendStatement(statement);
    
    this.log(`request sent for ${this.dox_id}: ${JSON.stringify({
      name: this.name,
      verb: this.verb,
      subject: this.subject,
      host: this.hostUrl,
    })}`)

    return 
  }

  _playListener(_) {
    this._video_verb = 'play'
    this.log(this._video_verb, 'event is fired')
    this.sendEvent()
  }

  _pauseListener(_) {
    this._video_verb = 'pause'

    const diff = Math.abs(this.video?.currentTime - this.video?.duration)

    if(diff < 0.1) {
      this.log(this._video_verb, 'occurred at the end => no event fired')

      return
    }

    this.log(this._video_verb, 'event is fired')
    this.sendEvent()
  }

  _seekedListener(_) {
    this._video_verb = 'seeked'

    if (this._ended_time - new Date().getTime() < 3000) {
      this.log(this._video_verb, 'occurred less than 3s after "ended" event => no event is fired')

      return
    }

    this.log(this._video_verb, 'event is fired')
    this.sendEvent()
  }

  _ended_time: number = 0;
  _endedListener(_) {
    this._video_verb = 'ended'

    this._ended_time = new Date().getTime()
    
    this.log(this._video_verb, 'event is fired')
    this.sendEvent()
  }

  registerObserver() {
    this.log('Registering scroll listener')

    // const el = document.getElementById(this.dox_id);

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        
        if(! entry.isIntersecting) {
          this.log(`Element is out of view ${this.timeout ? `trying to remove trigger for view counter (${this.view_timeout} seconds)` : ''}`)
          try{
            clearTimeout(this.timeout)
          }catch{}

          return
        }

        this.timeout = setTimeout(() => {
          this.log(`Element's ${Math.round(this.view_threshold)}% has been visible for ${this.view_timeout} seconds`)
          this.sendEvent()
        }, this.view_timeout * 1000)
        
        this.log(`Element's ${this.view_threshold}% is in view ${this.timeout ? `waiting for (${this.view_timeout}) seconds to send request` : ''}`)
      });
    }, {
      threshold: this.view_threshold / 100,
    })
    
    try {
      this.observer.observe(this.hostElement);
      this.log('Registered scroll listener')
    }catch{}
  }

  log(...msg) {
    if(this.debug) {
      console.log(`[beyim-xapi:INFO:${this.dox_id}] `, ...msg)
    }
  }

  error(...msg) {
    console.error(`[beyim-xapi:ERROR:${this.dox_id}]`, ...msg)
  }

  // style host element
  applyStyle() {
    const display = getComputedStyle(this.hostElement.firstElementChild)?.display ?? 'inline-block'

    this.hostElement.style.display = display === 'block' ? 'block' : 'inline-block'
    
    this.hostElement.style.margin = getComputedStyle(this.hostElement.firstElementChild)?.margin
    
    //@ts-ignore
    this.hostElement.firstElementChild.style.margin = '0px'
    
    this.hostElement.style.outline = getComputedStyle(this.hostElement.firstElementChild)?.outline
    //@ts-ignore
    
    this.hostElement.firstElementChild.style.outline = '0px'
    
    const width = getComputedStyle(this.hostElement.firstElementChild)?.width ?? '0px';
    if(!width.startsWith('0')) this.hostElement.style.width = getComputedStyle(this.hostElement.firstElementChild)?.width
    
    const height = getComputedStyle(this.hostElement.firstElementChild)?.height ?? '0px'
    if(!height.startsWith('0')) this.hostElement.style.height = getComputedStyle(this.hostElement.firstElementChild)?.height
  }
}
