'use client';

import { useEffect, useRef } from 'react';
import type { OpenAPIV3 } from 'openapi-types';

// @ts-expect-error: No official types for swagger-ui-dist bundle
import { SwaggerUIBundle } from 'swagger-ui-dist';
import 'swagger-ui-dist/swagger-ui.css';

interface SwaggerUIComponentProps {
  spec: OpenAPIV3.Document;
}

export default function SwaggerUIComponent({ spec }: SwaggerUIComponentProps) {
  const swaggerUIRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (swaggerUIRef.current && spec) {
      SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        deepLinking: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
        requestSnippetsEnabled: true,
        filter: true,
      });
    }
  }, [spec]);

  // ID "swagger-ui" di sini sangat penting karena digunakan oleh CSS di globals.css
  return <div id="swagger-ui" ref={swaggerUIRef} />;
}