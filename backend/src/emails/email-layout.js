export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createEmailLayout({
  previewText = "",
  eyebrow = "CARTIFY",
  heading,
  content,
}) {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>${escapeHtml(heading)}</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background: #f4f2f8;
          color: #191724;
          font-family: Arial, Helvetica, sans-serif;
        "
      >
        <div
          style="
            display: none;
            max-height: 0;
            overflow: hidden;
            opacity: 0;
          "
        >
          ${escapeHtml(previewText)}
        </div>

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="background: #f4f2f8"
        >
          <tr>
            <td align="center" style="padding: 32px 16px">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="
                  width: 100%;
                  max-width: 620px;
                  overflow: hidden;
                  border: 1px solid #ded9e8;
                  border-radius: 22px;
                  background: #ffffff;
                  box-shadow: 0 18px 45px
                    rgba(35, 24, 62, 0.1);
                "
              >
                <tr>
                  <td
                    style="
                      padding: 30px 34px;
                      color: #ffffff;
                      background:
                        linear-gradient(
                          135deg,
                          #272238,
                          #563d8c
                        );
                    "
                  >
                    <div
                      style="
                        margin-bottom: 8px;
                        color: #d9ccff;
                        font-size: 12px;
                        font-weight: 700;
                        letter-spacing: 0.18em;
                      "
                    >
                      ${escapeHtml(eyebrow)}
                    </div>

                    <h1
                      style="
                        margin: 0;
                        font-size: 30px;
                        line-height: 1.2;
                      "
                    >
                      ${escapeHtml(heading)}
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 34px;
                      font-size: 16px;
                      line-height: 1.65;
                    "
                  >
                    ${content}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 22px 34px;
                      border-top: 1px solid #ece8f2;
                      color: #716b7e;
                      background: #faf9fc;
                      font-size: 13px;
                      line-height: 1.6;
                    "
                  >
                    <strong style="color: #272238">
                      Cartify
                    </strong>
                    <br />
                    Technology made simple.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}