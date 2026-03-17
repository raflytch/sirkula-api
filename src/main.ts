/**
 * @fileoverview Main bootstrap file for Sirkula NestJS application
 * @description Entry point that configures global prefix, Swagger, validation pipe, and response interceptor
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './commons/interceptors/response.interceptor';
import { AppConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * Enable CORS for all origins
   * @description Allows cross-origin requests from any domain
   */
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false,
  });

  /**
   * Set global API prefix
   * All routes will be prefixed with /api
   */
  app.setGlobalPrefix('api');

  /**
   * Configure global validation pipe
   * @description Validates and transforms incoming request data
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  /**
   * Apply global response interceptor
   * @description Standardizes API response format: { statusCode, message, data, meta? }
   */
  app.useGlobalInterceptors(new ResponseInterceptor());

  /**
   * Configure Basic Authentication for API documentation
   * @description Protects /api-docs endpoint with username and password
   */
  const configService = app.get(AppConfigService);
  const apiDocsUsername = configService.apiDocsUsername;
  const apiDocsPassword = configService.apiDocsPassword;

  app.use('/api-docs', (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="API Documentation"');
      return res.status(401).send('Authentication required');
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
      'utf-8',
    );
    const [username, password] = credentials.split(':');

    if (username === apiDocsUsername && password === apiDocsPassword) {
      return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="API Documentation"');
    return res.status(401).send('Invalid credentials');
  });

  /**
   * Configure Swagger API documentation
   * @description Available at /api-docs endpoint (protected by basic auth)
   */
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sirkula API')
    .setDescription(
      `
      <p><strong>Sense Every Action, Reward Every Impact</strong></p>
      <p>API documentation untuk aplikasi Sirkula</p>
      <hr />
      <p>Sirkula adalah platform untuk mendorong aksi hijau di masyarakat
      dengan memberikan reward berupa voucher dari UMKM lokal.</p>
      `,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Masukkan JWT token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('App', 'Endpoint dasar aplikasi')
    .addTag('Users', 'Manajemen pengguna')
    .addTag('Green Actions', 'Aksi hijau dan verifikasi')
    .addTag('Vouchers', 'Voucher dari UMKM')
    .addTag('Leaderboard', 'Peringkat dan kompetisi')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Sirkula API Docs',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCssUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js',
    ],
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin-bottom: 20px }
      .swagger-ui .info hgroup.main { margin: 0 0 20px 0 }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  /**
   * Start the server on configured port
   * @default 3000
   */
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🌱 Sirkula API Server                                   ║
  ║   "Sense Every Action, Reward Every Impact"               ║
  ║                                                           ║
  ╠═══════════════════════════════════════════════════════════╣
  ║                                                           ║
  ║   🚀 Server running on: http://localhost:${port}             ║
  ║   📚 API Docs: http://localhost:${port}/api-docs             ║
  ║   🔗 API Base URL: http://localhost:${port}/api              ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
