import { Component, Host, h, Prop } from '@stencil/core';
import {User} from './user'
import { v4 as uuid } from 'uuid';
import { Element, HTMLStencilElement } from '@stencil/core/internal';

@Component({
  tag: 'beyim-xapi',
  styleUrl: 'beyim-xapi.css',
  shadow: true,
})
export class BeyimXapi {
  @Element()
  hostElement: HTMLStencilElement;  
  dox_id = uuid();
  observer: IntersectionObserver|undefined;
  timeout:NodeJS.Timeout|undefined;

  static LOCAL_BACKEND_URL = 'http://local.veracity.it'

  get hostUrl() {
    return this.host_url ? this.host_url : window.location.href;
  }

  /** X-API stuff */
  @Prop({attribute: 'verb'})
  verb!: string;
  
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
  type!: 'button'|'view';

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

    if(this.type !== 'button' && this.type !== 'view') {
      this.error(`forgot to add 'type' attribute`)
      window.alert(`[id:${this.dox_id}] beyim-xapi element requires type attribute ('view'|'button')`)

      return
    }

    if(!this.subject || !this.verb || !this.name) {
      this.error(`forgot to add 'attributes: 'subject', 'verb' or 'name'`)
      window.alert(`[id:${this.dox_id}] beyim-xapi element requires attribute 'name', 'verb', 'subject'`)
    }

    this.log(`Element is loaded`);
    if(this.isButton){
      this.log('Element is button')

      return
    }
    
    this.log('Element is view trigger')

    this.registerObserver()
  }

  disconnectedCallback() {
    this.log(`Element is disconnecting... ${this.observer ? 'disconnecting scroll listener' : ''}`);
    this.observer?.disconnect()
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

  registerObserver() {
    this.log('Registering scroll listener')

    const el = document.getElementById(this.dox_id);

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
      this.observer.observe(el);
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
    //@ts-ignore
    if(this.hostElement.firstElementChild.style) this.hostElement.style.margin = this.hostElement.firstElementChild.style.margin
    //@ts-ignore
    if(this.hostElement.firstElementChild.style) this.hostElement.firstElementChild.style.margin = '0px'
    //@ts-ignore
    if(this.hostElement.firstElementChild.style) this.hostElement.style.outline = this.hostElement.firstElementChild.style.outline
    //@ts-ignore
    if(this.hostElement.firstElementChild.style) this.hostElement.firstElementChild.style.outline = '0px'
    //@ts-ignore
    if(this.hostElement.firstElementChild.style) this.hostElement.style.width = this.hostElement.firstElementChild.style.width
    //@ts-ignore
    if(this.hostElement.firstElementChild.style) this.hostElement.style.height = this.hostElement.firstElementChild.style.height
  }
}
