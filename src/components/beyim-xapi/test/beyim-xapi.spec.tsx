import { newSpecPage } from '@stencil/core/testing';
import { BeyimXapi } from '../beyim-xapi';

describe('beyim-xapi', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [BeyimXapi],
      html: `<beyim-xapi></beyim-xapi>`,
    });
    expect(page.root).toEqualHtml(`
      <beyim-xapi>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </beyim-xapi>
    `);
  });
});
