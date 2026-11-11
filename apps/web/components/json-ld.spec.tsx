import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  generateDataCatalogSchema,
  generateGovernmentOrganizationSchema,
  JsonLd,
} from "./json-ld";

function renderSchemas(
  params: Parameters<typeof generateDataCatalogSchema>[0],
) {
  const { container } = render(
    <>
      <JsonLd schema={generateGovernmentOrganizationSchema(params)} />
      <JsonLd schema={generateDataCatalogSchema(params)} />
    </>,
  );
  return container.innerHTML;
}

describe("JSON-LD schemas", () => {
  it("não vaza tenant nem UF fixos quando o portal não tem URL oficial", () => {
    const html = renderSchemas({
      displayName: "Prefeitura Municipal de Cidade Exemplo",
      stateUF: "MG",
    });

    expect(html).not.toMatch(/porciuncula/i);
    expect(html).not.toContain('"RJ"');
    expect(html).toContain('"addressRegion":"MG"');
  });

  it("omite url, publisher.url e addressRegion sem configuração de portal", () => {
    const organization = generateGovernmentOrganizationSchema({});
    const catalog = generateDataCatalogSchema({});

    expect(organization).not.toHaveProperty("url");
    expect(organization.address).not.toHaveProperty("addressRegion");
    expect(catalog).not.toHaveProperty("url");
    expect(catalog.publisher).not.toHaveProperty("url");
  });

  it("usa a URL oficial do portal quando informada", () => {
    const officialPortalUrl = "https://transparencia.exemplo.mg.gov.br";
    const organization = generateGovernmentOrganizationSchema({
      officialPortalUrl,
      stateUF: "MG",
    });
    const catalog = generateDataCatalogSchema({ officialPortalUrl });

    expect(organization.url).toBe(officialPortalUrl);
    expect(catalog.url).toBe(officialPortalUrl);
    expect(catalog.publisher).toMatchObject({ url: officialPortalUrl });
  });
});
