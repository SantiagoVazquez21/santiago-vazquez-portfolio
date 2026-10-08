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
