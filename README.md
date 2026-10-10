# PortafolioEscritorio

## Requisitos

- **Node 24** (LTS). La versión está fijada en `.nvmrc`.
- **npm** como gestor de paquetes. No uses pnpm ni yarn: el proyecto solo tiene `package-lock.json`.

## Instalar

```bash
npm install
```

Después de `npm install` no hace falta ningún paso manual: ni variables de entorno, ni archivos que crear, ni configuración extra. Todos los comandos de abajo funcionan directamente. La única excepción es el envío real del formulario de contacto: sin sus variables el sitio funciona igual y el formulario muestra el error de envío (ver [Formulario de contacto (envío real)](#formulario-de-contacto-envío-real)).

## Ejecutar en desarrollo

```bash
npm run dev
```

Abrí en el navegador la URL local que indica la consola.

## Build de producción en local

```bash
npm run build
npm run start
```

`npm run build` genera el build de producción y `npm run start` lo sirve. Abrí en el navegador la URL local que indica la consola.

## Tests

```bash
npm run test
```

Ejecuta los tests de Vitest una sola vez (sin modo vigilancia).

## Comandos de calidad

| Comando                  | Qué comprueba               |
| ------------------------ | --------------------------- |
| `npx tsc --noEmit`       | Tipos de TypeScript         |
| `npm run lint`           | Reglas de ESLint            |
| `npx prettier --check .` | Formato con Prettier        |
| `npm run test`           | Tests de Vitest             |
| `npm run build`          | Build de producción de Next |

Todos deben terminar con código de salida 0. En un entorno limpio, la secuencia completa es:

```bash
npm install
npx tsc --noEmit
npm run lint
npx prettier --check .
npm run test
npm run build
```

## Formulario de contacto (envío real)

La ventana Contacto envía los mensajes por email con [Resend](https://resend.com), desde el servidor (`POST /api/contact`). Necesita dos variables de entorno, documentadas sin valores en `.env.example`:

| Variable           | Qué es                                          |
| ------------------ | ----------------------------------------------- |
| `RESEND_API_KEY`   | Clave de la API de Resend, con permiso de envío |
| `CONTACT_TO_EMAIL` | Tu email, donde llegan los mensajes             |

Las dos son solo del servidor: van en `.env.local` y en las variables de Vercel, nunca con un prefijo público que las exponga al navegador ni escritas en el repositorio (`.env*` está en `.gitignore`, salvo `.env.example`).

El remitente es `onboarding@resend.dev` (sin dominio verificado) y la dirección de respuesta (Reply-To) es el email del visitante: al responder, le escribes directamente a él. Con ese remitente, **Resend solo entrega al email de la cuenta de Resend**, así que la cuenta tiene que crearse con el mismo email que va en `CONTACT_TO_EMAIL`. Los mensajes pueden caer en spam.

### Probar el envío en local

1. Creá una cuenta en Resend con **tu email**, el mismo que vas a poner en `CONTACT_TO_EMAIL`.
2. En el panel de Resend, creá una API key con permiso de envío (_Sending access_) y copiala.
3. En la raíz del proyecto, creá `.env.local` (podés copiar `.env.example`) con las dos variables:

   ```bash
   RESEND_API_KEY=<tu clave de Resend>
   CONTACT_TO_EMAIL=<tu email>
   ```

4. Si `npm run dev` estaba corriendo, detenelo y volvé a lanzarlo: Next solo lee `.env.local` al arrancar.
5. Abrí la ventana Contacto y enviá un mensaje de prueba con un email de visitante al que tengas acceso.
6. Comprobá que el mensaje llegó a tu bandeja (mirá también en spam) y que al pulsar "Responder" el destinatario es el email del visitante.

### Configurar Vercel

1. En el proyecto de Vercel, abrí Project Settings → Environment Variables.
2. Cargá `RESEND_API_KEY` y `CONTACT_TO_EMAIL` con los mismos valores, marcando **Production** y **Preview**.
3. Volvé a desplegar (Redeploy): las variables nuevas solo se aplican a los despliegues posteriores.

### Qué ve el visitante

- **Si falta alguna variable** (o Resend falla): el sitio funciona igual, pero al enviar el formulario aparece el error de envío, con lo escrito conservado y el enlace a LinkedIn como alternativa.
- **Límite de intentos:** 5 envíos cada 10 minutos por visitante (por dirección de red). Al superarlo aparece el aviso de demasiados intentos, con lo escrito conservado. El límite vive en la memoria de cada instancia del servidor, así que reiniciar `npm run dev` lo vacía.

## Certificados de Formación

En la ventana Formación, cada estudio terminado puede tener un botón "Certificado" que muestra su PDF dentro de la misma ventana, con "Volver" para regresar a la lista y "Abrir / Descargar PDF" para abrirlo en una pestaña nueva. Hoy **ningún certificado está activo**: los dos estudios tienen `certificateFile: null` en `src/content/catalog.ts` y el botón no aparece. El certificado del Técnico se activa cuando el dueño entregue el analítico **con el DNI tapado**.

> **El PDF original nunca se publica ni se copia.** El analítico original, con el DNI a la vista, no va a `public/` ni a ninguna otra carpeta del proyecto o del scratchpad, ni completo ni en parte, ni con otro nombre, ni como base de otro PDF. Tampoco se abre desde el proyecto. Solo se publica la versión tapada que entrega el dueño. Es una regla de `CLAUDE.md` (sección "Reglas": no publicar el DNI ni documentos con datos sensibles del dueño sin taparlos; el CV es la única excepción aprobada) y una decisión del dueño (spec 009, RF-14).

### Activar el certificado

Hacé los pasos en este orden. Si alguno falla, pará: no se activa nada.

1. **Comprobación manual de RF-14, antes de copiar el archivo** (ver [Comprobación manual del DNI](#comprobación-manual-del-dni-rf-14)). Anotá el resultado en el registro de esa sección. Si algo falla, pedile al dueño otra versión (por ejemplo, impresa a PDF como imagen).
2. **Copiá el archivo tapado** a `public/certificates/` (creá la carpeta si no existe) con un nombre válido y distinto del original. Sugerido: `analitico-tecnico-informatica.pdf`. Un nombre es válido si:
   - empieza por una letra o un dígito;
   - después solo tiene letras sin tilde, dígitos, `_` o `-`;
   - termina en `.pdf`, en minúsculas;
   - no tiene espacios, `/`, `..`, `%`, tildes ni ñ.

   Es la regla de `certificateHref` en `src/lib/certificates.ts`: con un nombre inválido el botón no aparece y los tests fallan.

3. **Completá la línea del Técnico** en `src/content/catalog.ts`, cambiando solo el `null` por el nombre del archivo:

   ```ts
   { id: "itTechnician", hasStatus: false, certificateFile: "analitico-tecnico-informatica.pdf" },
   ```

   No toques la línea de la Tecnicatura: es un estudio en curso y no puede tener certificado.

4. **Corré los cinco comandos** de [Comandos de calidad](#comandos-de-calidad); todos tienen que terminar en verde.
5. **Probá en el navegador** sobre el build de producción (`npm run build` y `npm run start -- -p 3105`): el botón "Certificado" aparece solo en el Técnico, el visor muestra el PDF, "Volver" regresa a la lista y "Abrir / Descargar PDF" abre una pestaña nueva. Sacá capturas a 1280 y 360 px de ancho para el dueño y detené el servidor al terminar.
6. **Commit** solo cuando el dueño lo pida.

### Comprobación manual del DNI (RF-14)

Se hace sobre el PDF tapado que se va a publicar, nunca sobre el original. Tienen que cumplirse las tres:

- **(a) A la vista:** abrí el PDF y recorré todas las páginas. El DNI no se lee en ninguna, ni siquiera ampliando.
- **(b) Texto seleccionable:** seleccioná todo el texto (Ctrl+A) y buscá (Ctrl+F) los dígitos del DNI, con y sin puntos. No tienen que aparecer. Un rectángulo negro dibujado encima no borra el texto que queda debajo: si al copiar y pegar aparece el número, el tapado no sirve.
- **(c) Propiedades y metadatos:** revisá las propiedades del documento (autor, título, asunto, palabras clave y demás campos). No tienen que contener el DNI.

Registro (anotá fecha y resultado, **sin escribir nunca los dígitos del DNI**):

| Comprobación                  | Fecha     | Resultado                         |
| ----------------------------- | --------- | --------------------------------- |
| (a) DNI ilegible a la vista   | Pendiente | Pendiente: falta el PDF tapado    |
| (b) DNI ausente del texto     | Pendiente | Pendiente: falta el PDF tapado    |
| (c) DNI ausente de metadatos  | Pendiente | Pendiente: falta el PDF tapado    |

### Qué comprueban los tests y qué no

`npm run test` (en `tests/content/catalog.test.ts`, con las reglas de `src/lib/certificates.ts`) comprueba, sin leer el contenido de ningún PDF:

- que el archivo asignado existe en `public/certificates/`, tiene un nombre válido y pertenece a un estudio terminado;
- que `public/certificates/` solo contiene archivos asignados en el catálogo (hoy, ninguno): un archivo olvidado ahí hace fallar los tests;
- que los únicos PDF de todo `public/` son el CV y los certificados asignados;
- que ningún archivo de `public/` ni ningún `certificateFile` se llama como el PDF original.

Lo que **no** pueden comprobar: si el DNI está tapado (a la vista, en el texto o en los metadatos) ni si el archivo asignado es una copia renombrada del original. Eso solo lo cubre la comprobación manual, que es obligatoria antes de activar.
