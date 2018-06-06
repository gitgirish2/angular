/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgForOfContext} from '@angular/common';

import {RenderFlags, directiveInject} from '../../src/render3';
import {defineComponent} from '../../src/render3/definition';
import {bind, container, element, elementAttribute, elementClass, elementEnd, elementProperty, elementStart, elementStyle, elementStyleNamed, interpolation1, namespaceHTML, namespaceSVG, renderTemplate, text, textBinding} from '../../src/render3/instructions';
import {AttributeMarker, LElementNode, LNode} from '../../src/render3/interfaces/node';
import {RElement, domRendererFactory3} from '../../src/render3/interfaces/renderer';
import {TrustedString, bypassSanitizationTrustHtml, bypassSanitizationTrustResourceUrl, bypassSanitizationTrustScript, bypassSanitizationTrustStyle, bypassSanitizationTrustUrl, sanitizeHtml, sanitizeResourceUrl, sanitizeScript, sanitizeStyle, sanitizeUrl} from '../../src/sanitization/sanitization';
import {Sanitizer, SecurityContext} from '../../src/sanitization/security';

import {NgForOf} from './common_with_def';
import {ComponentFixture, TemplateFixture, toHtml} from './render_util';

describe('instructions', () => {
  function createAnchor() {
    elementStart(0, 'a');
    elementEnd();
  }

  function createDiv() {
    elementStart(0, 'div');
    elementEnd();
  }

  function createScript() {
    elementStart(0, 'script');
    elementEnd();
  }

  describe('bind', () => {
    it('should update bindings when value changes', () => {
      const t = new TemplateFixture(createAnchor);

      t.update(() => elementProperty(0, 'title', bind('Hello')));
      expect(t.html).toEqual('<a title="Hello"></a>');

      t.update(() => elementProperty(0, 'title', bind('World')));
      expect(t.html).toEqual('<a title="World"></a>');
      expect(ngDevMode).toHaveProperties({
        firstTemplatePass: 1,
        tNode: 2,  // 1 for hostElement + 1 for the template under test
        tView: 1,
        rendererCreateElement: 1,
        rendererSetProperty: 2
      });
    });

    it('should not update bindings when value does not change', () => {
      const idempotentUpdate = () => elementProperty(0, 'title', bind('Hello'));
      const t = new TemplateFixture(createAnchor, idempotentUpdate);

      t.update();
      expect(t.html).toEqual('<a title="Hello"></a>');

      t.update();
      expect(t.html).toEqual('<a title="Hello"></a>');
      expect(ngDevMode).toHaveProperties({
        firstTemplatePass: 1,
        tNode: 2,  // 1 for hostElement + 1 for the template under test
        tView: 1,
        rendererCreateElement: 1,
        rendererSetProperty: 1
      });
    });
  });

  describe('elementAttribute', () => {
    it('should use sanitizer function', () => {
      const t = new TemplateFixture(createDiv);

      t.update(() => elementAttribute(0, 'title', 'javascript:true', sanitizeUrl));
      expect(t.html).toEqual('<div title="unsafe:javascript:true"></div>');

      t.update(
          () => elementAttribute(
              0, 'title', bypassSanitizationTrustUrl('javascript:true'), sanitizeUrl));
      expect(t.html).toEqual('<div title="javascript:true"></div>');
      expect(ngDevMode).toHaveProperties({
        firstTemplatePass: 1,
        tNode: 2,  // 1 for div, 1 for host element
        tView: 1,
        rendererCreateElement: 1,
        rendererSetAttribute: 2
      });
    });

    it('should use sanitizer function even on elements with namespaced attributes', () => {
      const t = new TemplateFixture(() => {
        element(0, 'div', [
          AttributeMarker.NamespaceUri,
          'http://www.example.com/2004/test',
          'whatever',
          'abc',
        ]);
      });

      t.update(() => elementAttribute(0, 'title', 'javascript:true', sanitizeUrl));


      let standardHTML = '<div whatever="abc" title="unsafe:javascript:true"></div>';
      let ieHTML = '<div title="unsafe:javascript:true" whatever="abc"></div>';

      expect([standardHTML, ieHTML]).toContain(t.html);

      t.update(
          () => elementAttribute(
              0, 'title', bypassSanitizationTrustUrl('javascript:true'), sanitizeUrl));

      standardHTML = '<div whatever="abc" title="javascript:true"></div>';
      ieHTML = '<div title="javascript:true" whatever="abc"></div>';

      expect([standardHTML, ieHTML]).toContain(t.html);

      expect(ngDevMode).toHaveProperties({
        firstTemplatePass: 1,
        tNode: 2,
        tView: 1,
        rendererCreateElement: 1,
        rendererSetAttribute: 2
      });
    });
  });

  describe('elementProperty', () => {
    it('should use sanitizer function when available', () => {
      const t = new TemplateFixture(createDiv);

      t.update(() => elementProperty(0, 'title', 'javascript:true', sanitizeUrl));
      expect(t.html).toEqual('<div title="unsafe:javascript:true"></div>');

      t.update(
          () => elementProperty(
              0, 'title', bypassSanitizationTrustUrl('javascript:false'), sanitizeUrl));
      expect(t.html).toEqual('<div title="javascript:false"></div>');
      expect(ngDevMode).toHaveProperties({
        firstTemplatePass: 1,
        tNode: 2,  // 1 for div, 1 for host element
        tView: 1,
        rendererCreateElement: 1,
      });
    });

    it('should not stringify non string values', () => {
      const t = new TemplateFixture(createDiv);

      t.update(() => elementProperty(0, 'hidden', false));
      // The hidden property would be true if `false` was stringified into `"false"`.
      expect((t.hostNode.native as HTMLElement).querySelector('div') !.hidden).toEqual(false);
      expect(ngDevMode).toHaveProperties({
        firstTemplatePass: 1,
        tNode: 2,  // 1 for div, 1 for host element
        tView: 1,
        rendererCreateElement: 1,
        rendererSetProperty: 1
      });
    });
  });

  describe('elementStyleNamed', () => {
    it('should use sanitizer function', () => {
      const t = new TemplateFixture(createDiv);
      t.update(
          () => elementStyleNamed(0, 'background-image', 'url("http://server")', sanitizeStyle));
      // nothing is set because sanitizer suppresses it.
      expect(t.html).toEqual('<div></div>');

      t.update(
          () => elementStyleNamed(
              0, 'background-image', bypassSanitizationTrustStyle('url("http://server")'),
              sanitizeStyle));
      expect((t.hostElement.firstChild as HTMLElement).style.getPropertyValue('background-image'))
          .toEqual('url("http://server")');
    });
  });

  describe('elementStyle', () => {
    function createDivWithStyle() {
      elementStart(0, 'div', ['style', 'height: 10px']);
      elementEnd();
    }

    it('should add style', () => {
      const fixture = new TemplateFixture(createDivWithStyle);
      fixture.update(() => elementStyle(0, {'background-color': 'red'}));
      expect(fixture.html).toEqual('<div style="height: 10px; background-color: red;"></div>');
    });
  });

  describe('elementClass', () => {

    it('should add class', () => {
      const fixture = new TemplateFixture(createDiv);
      fixture.update(() => elementClass(0, 'multiple classes'));
      expect(fixture.html).toEqual('<div class="multiple classes"></div>');
    });
  });

  describe('performance counters', () => {
    it('should create tViews only once for each nested level', () => {
      const _c0 = ['ngFor', '', 'ngForOf', ''];
      /**
       * <ul *ngFor="let row of rows">
       *   <li *ngFor="let col of row.cols">{{col}}</li>
       * </ul>
       */
      class NestedLoops {
        rows = [['a', 'b'], ['A', 'B'], ['a', 'b'], ['A', 'B']];

        static ngComponentDef = defineComponent({
          type: NestedLoops,
          selectors: [['nested-loops']],
          factory: function ToDoAppComponent_Factory() { return new NestedLoops(); },
          template: function ToDoAppComponent_Template(rf: RenderFlags, ctx: NestedLoops) {
            if (rf & RenderFlags.Create) {
              container(0, ToDoAppComponent_NgForOf_Template_0, null, _c0);
            }
            if (rf & RenderFlags.Update) {
              elementProperty(0, 'ngForOf', bind(ctx.rows));
            }
            function ToDoAppComponent_NgForOf_Template_0(
                rf: RenderFlags, ctx0: NgForOfContext<any>) {
              if (rf & RenderFlags.Create) {
                elementStart(0, 'ul');
                container(1, ToDoAppComponent_NgForOf_NgForOf_Template_1, null, _c0);
                elementEnd();
              }
              if (rf & RenderFlags.Update) {
                const row_r2 = ctx0.$implicit;
                elementProperty(1, 'ngForOf', bind(row_r2));
              }
              function ToDoAppComponent_NgForOf_NgForOf_Template_1(
                  rf: RenderFlags, ctx1: NgForOfContext<any>) {
                if (rf & RenderFlags.Create) {
                  elementStart(0, 'li');
                  text(1);
                  elementEnd();
                }
                if (rf & RenderFlags.Update) {
                  const col_r3 = ctx1.$implicit;
                  textBinding(1, interpolation1('', col_r3, ''));
                }
              }
            }
          },
          directives: [NgForOf]
        });
      }
      const fixture = new ComponentFixture(NestedLoops);
      expect(ngDevMode).toHaveProperties({
        // Expect: fixture view/Host view + component + ngForRow + ngForCol
        tView: 4,  // should be: 4,
      });

    });
  });

  describe('sanitization injection compatibility', () => {
    it('should work for url sanitization', () => {
      const s = new LocalMockSanitizer(value => `${value}-sanitized`);
      const t = new TemplateFixture(createAnchor, undefined, null, null, s);
      const inputValue = 'http://foo';
      const outputValue = 'http://foo-sanitized';

      t.update(() => elementAttribute(0, 'href', inputValue, sanitizeUrl));
      expect(t.html).toEqual(`<a href="${outputValue}"></a>`);
      expect(s.lastSanitizedValue).toEqual(outputValue);
    });

    it('should bypass url sanitization if marked by the service', () => {
      const s = new LocalMockSanitizer(value => '');
      const t = new TemplateFixture(createAnchor, undefined, null, null, s);
      const inputValue = s.bypassSecurityTrustUrl('http://foo');
      const outputValue = 'http://foo';

      t.update(() => elementAttribute(0, 'href', inputValue, sanitizeUrl));
      expect(t.html).toEqual(`<a href="${outputValue}"></a>`);
      expect(s.lastSanitizedValue).toBeFalsy();
    });

    it('should bypass ivy-level url sanitization if a custom sanitizer is used', () => {
      const s = new LocalMockSanitizer(value => '');
      const t = new TemplateFixture(createAnchor, undefined, null, null, s);
      const inputValue = bypassSanitizationTrustUrl('http://foo');
      const outputValue = 'http://foo-ivy';

      t.update(() => elementAttribute(0, 'href', inputValue, sanitizeUrl));
      expect(t.html).toEqual(`<a href="${outputValue}"></a>`);
      expect(s.lastSanitizedValue).toBeFalsy();
    });

    it('should work for style sanitization', () => {
      const s = new LocalMockSanitizer(value => `color:blue`);
      const t = new TemplateFixture(createDiv, undefined, null, null, s);
      const inputValue = 'color:red';
      const outputValue = 'color:blue';

      t.update(() => elementAttribute(0, 'style', inputValue, sanitizeStyle));
      expect(stripStyleWsCharacters(t.html)).toEqual(`<div style="${outputValue}"></div>`);
      expect(s.lastSanitizedValue).toEqual(outputValue);
    });

    it('should bypass style sanitization if marked by the service', () => {
      const s = new LocalMockSanitizer(value => '');
      const t = new TemplateFixture(createDiv, undefined, null, null, s);
      const inputValue = s.bypassSecurityTrustStyle('color:maroon');
      const outputValue = 'color:maroon';

      t.update(() => elementAttribute(0, 'style', inputValue, sanitizeStyle));
      expect(stripStyleWsCharacters(t.html)).toEqual(`<div style="${outputValue}"></div>`);
      expect(s.lastSanitizedValue).toBeFalsy();
    });

    it('should bypass ivy-level style sanitization if a custom sanitizer is used', () => {
      const s = new LocalMockSanitizer(value => '');
      const t = new TemplateFixture(createDiv, undefined, null, null, s);
      const inputValue = bypassSanitizationTrustStyle('font-family:foo');
      const outputValue = 'font-family:foo-ivy';

      t.update(() => elementAttribute(0, 'style', inputValue, sanitizeStyle));
      expect(stripStyleWsCharacters(t.html)).toEqual(`<div style="${outputValue}"></div>`);
      expect(s.lastSanitizedValue).toBeFalsy();
    });

    it('should work for resourceUrl sanitization', () => {
      const s = new LocalMockSanitizer(value => `${value}-sanitized`);
      const t = new TemplateFixture(createScript, undefined, null, null, s);
      const inputValue = 'http://resource';
      const outputValue = 'http://resource-sanitized';

      t.update(() => elementAttribute(0, 'src', inputValue, sanitizeResourceUrl));
      expect(t.html).toEqual(`<script src="${outputValue}"></script>`);
      expect(s.lastSanitizedValue).toEqual(outputValue);
    });

    it('should bypass resourceUrl sanitization if marked by the service', () => {
      const s = new LocalMockSanitizer(value => '');
      const t = new TemplateFixture(createScript, undefined, null, null, s);
      const inputValue = s.bypassSecurityTrustResourceUrl('file://all-my-secrets.pdf');
      const outputValue = 'file://all-my-secrets.pdf';

      t.update(() => elementAttribute(0, 'src', inputValue, sanitizeResourceUrl));
      expect(t.html).toEqual(`<script src="${outputValue}"></script>`);
      expect(s.lastSanitizedValue).toBeFalsy();
    });

    it('should bypass ivy-level resourceUrl sanitization if a custom sanitizer is used', () => {
      const s = new LocalMockSanitizer(value => '');
      const t = new TemplateFixture(createScript, undefined, null, null, s);
      const inputValue = bypassSanitizationTrustResourceUrl('file://all-my-secrets.pdf');
      const outputValue = 'file://all-my-secrets.pdf-ivy';

      t.update(() => elementAttribute(0, 'src', inputValue, sanitizeResourceUrl));
      expect(t.html).toEqual(`<script src="${outputValue}"></script>`);
      expect(s.lastSanitizedValue).toBeFalsy();
    });

    it('should work for script sanitization', () => {
      const s = new LocalMockSanitizer(value => `${value} //sanitized`);
      const t = new TemplateFixture(createScript, undefined, null, null, s);
      const inputValue = 'fn();';
      const outputValue = 'fn(); //sanitized';

      t.update(() => elementProperty(0, 'innerHTML', inputValue, sanitizeScript));
      expect(t.html).toEqual(`<script>${outputValue}</script>`);
      expect(s.lastSanitizedValue).toEqual(outputValue);
    });

    it('should bypass script sanitization if marked by the service', () => {
      const s = new LocalMockSanitizer(value => '');
      const t = new TemplateFixture(createScript, undefined, null, null, s);
      const inputValue = s.bypassSecurityTrustScript('alert("bar")');
      const outputValue = 'alert("bar")';

      t.update(() => elementProperty(0, 'innerHTML', inputValue, sanitizeScript));
      expect(t.html).toEqual(`<script>${outputValue}</script>`);
      expect(s.lastSanitizedValue).toBeFalsy();
    });

    it('should bypass ivy-level script sanitization if a custom sanitizer is used', () => {
      const s = new LocalMockSanitizer(value => '');
      const t = new TemplateFixture(createScript, undefined, null, null, s);
      const inputValue = bypassSanitizationTrustScript('alert("bar")');
      const outputValue = 'alert("bar")-ivy';

      t.update(() => elementProperty(0, 'innerHTML', inputValue, sanitizeScript));
      expect(t.html).toEqual(`<script>${outputValue}</script>`);
      expect(s.lastSanitizedValue).toBeFalsy();
    });

    it('should work for html sanitization', () => {
      const s = new LocalMockSanitizer(value => `${value} <!--sanitized-->`);
      const t = new TemplateFixture(createDiv, undefined, null, null, s);
      const inputValue = '<header></header>';
      const outputValue = '<header></header> <!--sanitized-->';

      t.update(() => elementProperty(0, 'innerHTML', inputValue, sanitizeHtml));
      expect(t.html).toEqual(`<div>${outputValue}</div>`);
      expect(s.lastSanitizedValue).toEqual(outputValue);
    });

    it('should bypass html sanitization if marked by the service', () => {
      const s = new LocalMockSanitizer(value => '');
      const t = new TemplateFixture(createDiv, undefined, null, null, s);
      const inputValue = s.bypassSecurityTrustHtml('<div onclick="alert(123)"></div>');
      const outputValue = '<div onclick="alert(123)"></div>';

      t.update(() => elementProperty(0, 'innerHTML', inputValue, sanitizeHtml));
      expect(t.html).toEqual(`<div>${outputValue}</div>`);
      expect(s.lastSanitizedValue).toBeFalsy();
    });

    it('should bypass ivy-level script sanitization if a custom sanitizer is used', () => {
      const s = new LocalMockSanitizer(value => '');
      const t = new TemplateFixture(createDiv, undefined, null, null, s);
      const inputValue = bypassSanitizationTrustHtml('<div onclick="alert(123)"></div>');
      const outputValue = '<div onclick="alert(123)"></div>-ivy';

      t.update(() => elementProperty(0, 'innerHTML', inputValue, sanitizeHtml));
      expect(t.html).toEqual(`<div>${outputValue}</div>`);
      expect(s.lastSanitizedValue).toBeFalsy();
    });
  });

  describe('namespace', () => {
    it('should render SVG', () => {
      const t = new TemplateFixture(() => {
        elementStart(0, 'div', ['id', 'container']);
        namespaceSVG();
        elementStart(1, 'svg', [
          // id="display"
          'id',
          'display',
          // width="400"
          'width',
          '400',
          // height="300"
          'height',
          '300',
          // test:title="abc"
          AttributeMarker.NamespaceUri,
          'http://www.example.com/2014/test',
          'title',
          'abc',
        ]);
        element(2, 'circle', ['cx', '200', 'cy', '150', 'fill', '#0000ff']);
        elementEnd();
        namespaceHTML();
        elementEnd();
      });


      // Most browsers will print <circle></circle>, some will print <circle />, both are valid
      const standardHTML =
          '<div id="container"><svg id="display" width="400" height="300" title="abc"><circle cx="200" cy="150" fill="#0000ff"></circle></svg></div>';
      const ie11HTML =
          '<div id="container"><svg xmlns="http://www.w3.org/2000/svg" xmlns:NS1="http://www.example.com/2014/test" NS1:title="abc" id="display" width="400" height="300"><circle fill="#0000ff" cx="200" cy="150" /></svg></div>';

      expect([standardHTML, ie11HTML]).toContain(t.html);
    });

    it('should set an attribute with a namespace', () => {
      const t = new TemplateFixture(() => {
        element(0, 'div', [
          'id',
          'container',
          // test:title="abc"
          AttributeMarker.NamespaceUri,
          'http://www.example.com/2014/test',
          'title',
          'abc',
        ]);
      });

      const standardHTML = '<div id="container" title="abc"></div>';
      const ie11HTML =
          '<div id="container" xmlns:NS1="https://www.example.com/2014/test" NS1:title="abc"></div>';
      expect([standardHTML, ie11HTML]).toContain(t.html);
    });

    it('should set attributes including more than one namespaced attribute', () => {
      const t = new TemplateFixture(() => {
        element(0, 'div', [
          'id',
          'container',

          // NS1:title="abc"
          AttributeMarker.NamespaceUri,
          'http://www.example.com/2014/test',
          'title',
          'abc',

          // NS1:whatever="wee"
          AttributeMarker.NamespaceUri,
          'http://www.example.com/2014/test',
          'whatever',
          'wee',

          // NS2:shazbot="wocka wocka"
          AttributeMarker.NamespaceUri,
          'http://www.whatever.com/2016/blah',
          'shazbot',
          'wocka wocka',
        ]);
      });

      const standardHTML =
          '<div id="container" title="abc" whatever="wee" shazbot="wocka wocka"></div>';

      expect(t.html).toEqual(standardHTML);

      const div = t.hostElement.querySelector('#container');
      expect(div !.attributes.length).toBe(4);

      const expectedAttributes: {[key: string]: string} = {
        'id': 'container',
        'http://www.example.com/2014/test:title': 'abc',
        'http://www.example.com/2014/test:whatever': 'wee',
        'http://www.whatever.com/2016/blah:shazbot': 'wocka wocka',
      };

      Array.from(div !.attributes).forEach(attr => {
        const key = attr.namespaceURI ? attr.namespaceURI + ':' + attr.name : attr.name;
        expect(attr.value).toEqual(expectedAttributes[key]);
      });
    });
  });
});

class LocalSanitizedValue {
  constructor(public value: any) {}

  toString() { return this.value; }
}

class LocalMockSanitizer implements Sanitizer {
  public lastSanitizedValue: string|null;

  constructor(private _interceptor: (value: string|null|any) => string) {}

  sanitize(context: SecurityContext, value: LocalSanitizedValue|string|null|any): string|null {
    if (value instanceof String) {
      return value.toString() + '-ivy';
    }

    if (value instanceof LocalSanitizedValue) {
      return value.toString();
    }

    return this.lastSanitizedValue = this._interceptor(value);
  }

  bypassSecurityTrustHtml(value: string) { return new LocalSanitizedValue(value); }

  bypassSecurityTrustStyle(value: string) { return new LocalSanitizedValue(value); }

  bypassSecurityTrustScript(value: string) { return new LocalSanitizedValue(value); }

  bypassSecurityTrustUrl(value: string) { return new LocalSanitizedValue(value); }

  bypassSecurityTrustResourceUrl(value: string) { return new LocalSanitizedValue(value); }
}

function stripStyleWsCharacters(value: string): string {
  // color: blue; => color:blue
  return value.replace(/;/g, '').replace(/:\s+/g, ':');
}