# Registro de logos de terceros

Registro de licencias de los logos de la ventana Habilidades (spec 004, RF-12, RF-15 y RNF-5; plan 004, secciones 6 y 10).

## Origen

- Colección: Simple Icons, versión **16.34.0** (fija).
- Archivo de datos: `https://cdn.jsdelivr.net/npm/simple-icons@16.34.0/data/simple-icons.json` (array de 3464 entradas).
- Licencia: `https://cdn.jsdelivr.net/npm/simple-icons@16.34.0/LICENSE.md`.
- Cada logo: `https://cdn.jsdelivr.net/npm/simple-icons@16.34.0/icons/<slug>.svg`.
- Descarga con `curl` y verificación: 2026-10-08 (los 12 CC0 en T6; JavaScript, PHP y Git en T16).

## Licencia

El `LICENSE.md` de 16.34.0 es el texto de **CC0 1.0 Universal**: el autor renuncia a todos sus derechos de autor y conexos sobre la obra, en todo el mundo y para cualquier fin, incluido el comercial, y permite reproducirla, adaptarla y distribuirla. Su punto 4.1 aclara que **no** renuncia a derechos de marca ni de patente. Simple Icons declara en el campo `license` de cada entrada los íconos que tienen otra licencia; una entrada sin ese campo es CC0.

Desde el cambio del 2026-10-08 (spec 004, decisión 12) también se usan tres logos cuya entrada declara MIT, CC BY o CC BY-SA, cumpliendo su licencia (sección "Logos con licencia de atribución").

Por eso el logo solo nombra la tecnología: no es enlace ni sugiere relación con la marca (RF-12). Varias entradas traen `guidelines` (pautas de uso de la marca), anotadas abajo.

## Verificación

Un script de Node de un solo uso, sin paquetes y fuera del proyecto, comprobó contra el archivo de datos cada fila de la tabla del plan (sección 6): las 20 coinciden. Para cada logo CC0: una sola entrada con ese `title` exacto, con campo `slug`, sin campo `license`, con el `hex` de la tabla, descarga del SVG con respuesta 200 y `<title>` igual al título.

Cada SVG se revisó antes de copiarlo: un único `<svg>` con `<title>` y un `<path>`, sin `<script>`, `href`, `xlink:href`, `<foreignObject>`, `style` ni atributos `on*`. El único cambio es el atributo `fill` en el `<svg>`, con el color que da `logoFill` (`src/lib/color-contrast.ts`): el de marca si tiene al menos 3:1 contra el blanco del cuerpo (`#FFFFFF`), si no negro (`#000000`). El test `tests/content/skill-logos.test.ts` lo comprueba.

## Logos CC0 (12), en `public/skills/<slug>.svg`

| Habilidad | Título de la entrada | Slug | Campo `license` | Color de marca | Contraste contra `#FFFFFF` | Color usado | `guidelines` |
|---|---|---|---|---|---|---|---|
| HTML | HTML5 | `html5` | ausente | `#E34F26` | 3,88:1 | `#E34F26` (marca) | — |
| CSS | CSS | `css` | ausente | `#663399` | 8,41:1 | `#663399` (marca) | https://github.com/CSS-Next/logo.css |
| React | React | `react` | ausente | `#61DAFB` | 1,62:1 | `#000000` (negro) | — |
| Tailwind | Tailwind CSS | `tailwindcss` | ausente | `#06B6D4` | 2,43:1 | `#000000` (negro) | https://tailwindcss.com/brand |
| Python | Python | `python` | ausente | `#3776AB` | 4,84:1 | `#3776AB` (marca) | https://www.python.org/community/logos/ |
| MySQL | MySQL | `mysql` | ausente | `#4479A1` | 4,67:1 | `#4479A1` (marca) | https://www.mysql.com/about/legal/logos.html |
| PostgreSQL | PostgreSQL | `postgresql` | ausente | `#4169E1` | 4,85:1 | `#4169E1` (marca) | https://www.postgresql.org/about/policies/trademarks/ |
| GitHub | GitHub | `github` | ausente | `#181717` | 17,89:1 | `#181717` (marca) | https://github.com/logos |
| Figma | Figma | `figma` | ausente | `#F24E1E` | 3,57:1 | `#F24E1E` (marca) | https://www.figma.com/using-the-figma-brand/ |
| Vite | Vite | `vite` | ausente | `#9135FF` | 5,05:1 | `#9135FF` (marca) | — |
| Arduino | Arduino | `arduino` | ausente | `#00878F` | 4,32:1 | `#00878F` (marca) | https://www.arduino.cc/en/trademark |
| Linux | Linux | `linux` | ausente | `#FCC624` | 1,59:1 | `#000000` (negro) | — |

Resultado: 9 en su color de marca y 3 en negro (React, Tailwind CSS y Linux).

## Logos con licencia de atribución (3), en `public/skills/<slug>.svg`

Verificados en T16 (2026-10-08) con el mismo método: un script de Node de un solo uso, sin paquetes y fuera del proyecto, comprobó contra `data/simple-icons.json` de 16.34.0 que hay una sola entrada con cada título, su `slug`, su `hex`, su `license.type` (ninguna trae `license.url`) y su `source`; descarga de cada SVG con respuesta 200 y la misma revisión de seguridad (un `<svg>`, `<title>` igual al título, un `<path>`, sin `fill`, `<script>`, `href`, `<foreignObject>`, `style` ni `on*`). El `LICENSE` de JavaScript se descargó del commit fijado que cita `source` y es MIT.

| Habilidad | Título | Slug | `license.type` | URL de la licencia usada | `source` | Autor o titular | Color de marca | Contraste contra `#FFFFFF` | Color usado |
|---|---|---|---|---|---|---|---|---|---|
| JavaScript | JavaScript | `javascript` | `MIT` | https://github.com/voodootikigod/logo.js/blob/1544bdeed6d618a6cfe4f0650d04ab8d9cfa76d9/LICENSE (sin `license.url`: el `LICENSE` del commit fijado de `source`) | https://github.com/voodootikigod/logo.js/blob/1544bdeed6d618a6cfe4f0650d04ab8d9cfa76d9/js.svg | Christopher Williams (línea de copyright del `LICENSE`, 2011) | `#F7DF1E` | 1,35:1 | `#000000` (negro) |
| PHP | PHP | `php` | `CC-BY-SA-4.0` | https://creativecommons.org/licenses/by-sa/4.0/ (sin `license.url`: la oficial de Creative Commons) | https://php.net/download-logos.php | Colin Viebrock (lo dice la página de `source`) | `#777BB4` | 3,98:1 | `#777BB4` (marca) |
| Git | Git | `git` | `CC-BY-3.0` | https://creativecommons.org/licenses/by/3.0/ (sin `license.url`: la oficial de Creative Commons) | https://git-scm.com/community/logos | Jason Long (lo dice la página de `source`) | `#F03C2E` | 3,90:1 | `#F03C2E` (marca) |

En total, 15 logos de Simple Icons: 11 en su color de marca y 4 en negro (React, Tailwind CSS, Linux y JavaScript). El test `tests/content/skill-logos.test.ts` comprueba el `fill` de los 15 y el aviso de `LICENSES.md`.

**Modificación.** Los tres archivos publicados difieren del de Simple Icons: se les agregó el atributo `fill` en el `<svg>` con el color de `logoFill`, y nada más. JavaScript lo permite la licencia MIT, siempre con su aviso. PHP es una obra modificada que sigue bajo **CC BY-SA 4.0** (share-alike: se distribuye bajo la misma licencia). Git es una obra modificada que sigue bajo **CC BY 3.0**.

**Dónde va la atribución.**
- Aviso junto a los archivos: `public/skills/LICENSES.md` (se publica en `/skills/LICENSES.md` y está en el repositorio). Reproduce letra por letra el aviso MIT de JavaScript (encabezado, línea de copyright y texto de permiso) y la atribución de PHP y Git (autor, fuente, licencia con URL y modificación).
- Crédito visible (solo CC BY y CC BY-SA, RF-15): la línea de créditos al pie de la ventana Habilidades, en las dos vistas: "Logo de PHP por Colin Viebrock (color aplicado), [CC BY-SA 4.0] · Logo de Git por Jason Long (color aplicado), [CC BY 3.0]" (en inglés, "PHP logo by Colin Viebrock (color applied), [CC BY-SA 4.0] · Git logo by Jason Long (color applied), [CC BY 3.0]"), con cada licencia como enlace a su URL en una pestaña nueva. JavaScript (MIT) no lleva crédito visible.
- Datos: la URL de cada licencia en `LOGO_CREDITS` (`src/content/catalog.ts`); autor y nombre de la licencia en `logoCredits` de `src/content/es.ts` y `en.ts`.

## Marcas con ícono genérico (5), `public/skills/own-program.svg`

Dibujo propio de "programa" (spec 004, decisión 11), nunca una imitación del logo.

| Habilidad | Motivo |
|---|---|
| KAPLAY | No hay ninguna entrada con ese título. |
| Excel | No hay ninguna entrada con ese título. |
| Windows | No hay ninguna entrada con ese título; "Git for Windows" (`gitforwindows`) es otra marca y se descarta. |
| Scrum | No hay ninguna entrada con ese título; "Scrum Alliance" (`scrumalliance`) es otra marca y se descarta. |
| C# | No hay ninguna entrada con ese título; "C" (`c`) es otro lenguaje y se descarta. |

## Conceptos con dibujo propio (4)

No son marcas y no se buscan en Simple Icons: Modelado relacional (`own-erd.svg`), Hardware (`own-hardware.svg`), Redes (`own-network.svg`) y Soporte técnico (`own-support.svg`), en `public/skills/`.
