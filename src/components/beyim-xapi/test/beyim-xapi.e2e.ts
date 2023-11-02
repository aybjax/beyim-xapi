import { newE2EPage } from '@stencil/core/testing';

describe('beyim-xapi', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<beyim-xapi></beyim-xapi>');

    const element = await page.find('beyim-xapi');
    expect(element).toHaveClass('hydrated');
  });
});
