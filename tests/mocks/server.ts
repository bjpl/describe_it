import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { UnsplashSearchResponse, GeneratedDescription, QAGeneration, PhraseCategories } from '../../src/types/api';

// Mock data generators
const generateMockImage = (id: string, query: string) => ({
  id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  width: 800,
  height: 600,
  color: '#' + Math.floor(Math.random()*16777215).toString(16),
  blur_hash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.',
  description: `A beautiful ${query} photograph`,
  alt_description: `${query} image ${id}`,
  urls: {
    raw: `https://images.unsplash.com/photo-${id}?ixlib=rb-4.0.3`,
    full: `https://images.unsplash.com/photo-${id}?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb`,
    regular: `https://images.unsplash.com/photo-${id}?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=srgb&w=1080`,
    small: `https://images.unsplash.com/photo-${id}?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=srgb&w=400`,
    thumb: `https://images.unsplash.com/photo-${id}?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=srgb&w=200`,
    small_s3: `https://s3.us-west-2.amazonaws.com/images.unsplash.com/photo-${id}`,
  },
  links: {
    self: `https://api.unsplash.com/photos/${id}`,
    html: `https://unsplash.com/photos/${id}`,
    download: `https://unsplash.com/photos/${id}/download`,
    download_location: `https://api.unsplash.com/photos/${id}/download`,
  },
  user: {
    id: `user-${id}`,
    username: `photographer${id}`,
    name: `Photographer ${id}`,
    first_name: 'Photographer',
    last_name: id,
    instagram_username: null,
    twitter_username: null,
    portfolio_url: null,
    bio: `Professional photographer specializing in ${query}`,
    location: 'Test Location',
    total_likes: Math.floor(Math.random() * 1000),
    total_photos: Math.floor(Math.random() * 500),
    accepted_tos: true,
    profile_image: {
      small: `https://images.unsplash.com/profile-${id}?ixlib=rb-4.0.3&crop=faces&fit=crop&w=32&h=32`,
      medium: `https://images.unsplash.com/profile-${id}?ixlib=rb-4.0.3&crop=faces&fit=crop&w=64&h=64`,
      large: `https://images.unsplash.com/profile-${id}?ixlib=rb-4.0.3&crop=faces&fit=crop&w=128&h=128`,
    },
    links: {
      self: `https://api.unsplash.com/users/${id}`,
      html: `https://unsplash.com/@photographer${id}`,
      photos: `https://api.unsplash.com/users/${id}/photos`,
      likes: `https://api.unsplash.com/users/${id}/likes`,
      portfolio: `https://api.unsplash.com/users/${id}/portfolio`,
    },
  },
  tags: [
    { type: 'landing_page', title: query },
    { type: 'search', title: 'test' },
  ],
});

// API handlers
export const handlers = [
  // Image search endpoint
  http.get('/api/images/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query') || 'nature';
    const page = parseInt(url.searchParams.get('page') || '1');
    const per_page = parseInt(url.searchParams.get('per_page') || '20');
    
    // Simulate error for specific test cases
    if (query === 'error') {
      return HttpResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    // Simulate rate limiting
    if (query === 'rate-limit') {
      return HttpResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const mockImages = Array.from({ length: per_page }, (_, i) => 
      generateMockImage(`${query}-${page}-${i}`, query)
    );

    const response: UnsplashSearchResponse = {
      total: 1000,
      total_pages: Math.ceil(1000 / per_page),
      results: mockImages,
    };

    return HttpResponse.json(response);
  }),

  // Description generation endpoint
  http.post('/api/descriptions/generate', async ({ request }) => {
    const body = await request.json() as any;
    
    // Simulate validation error
    if (!body.imageUrl) {
      return HttpResponse.json(
        { error: 'Invalid parameters', details: [{ field: 'imageUrl', message: 'Required' }] },
        { status: 400 }
      );
    }

    // Simulate server error
    if (body.imageUrl.includes('error')) {
      return HttpResponse.json(
        { error: 'Failed to generate description' },
        { status: 500 }
      );
    }

    const description: GeneratedDescription = {
      style: body.style || 'narrativo',
      text: `This is a ${body.style || 'narrative'} description of the image. The image shows beautiful scenery with vibrant colors and interesting composition. This description demonstrates the ${body.style || 'narrative'} style of image analysis.`,
      language: body.language || 'es',
      wordCount: 42,
      generatedAt: new Date().toISOString(),
    };

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return HttpResponse.json(description);
  }),

  // Question/Answer generation endpoint
  http.post('/api/qa/generate', async ({ request }) => {
    const body = await request.json() as any;
    
    if (!body.descriptionText) {
      return HttpResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const questions: QAGeneration[] = Array.from({ length: body.count || 5 }, (_, i) => ({
      question: `¿Qué elementos puedes observar en la imagen? (Pregunta ${i + 1})`,
      answer: `En la imagen se pueden observar varios elementos interesantes que muestran... (Respuesta ${i + 1})`,
      difficulty: ['facil', 'medio', 'dificil'][i % 3] as 'facil' | 'medio' | 'dificil',
      category: ['descripción', 'análisis', 'interpretación'][i % 3],
    }));

    await new Promise(resolve => setTimeout(resolve, 100));

    return HttpResponse.json({ questions });
  }),

  // Phrase extraction endpoint
  http.post('/api/phrases/extract', async ({ request }) => {
    const body = await request.json() as any;
    
    if (!body.text) {
      return HttpResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const phrases: PhraseCategories = {
      objetos: ['montaña', 'cielo', 'árbol', 'agua', 'piedra'],
      acciones: ['caminar', 'observar', 'explorar', 'descubrir', 'contemplar'],
      lugares: ['parque nacional', 'sendero', 'cima', 'valle', 'bosque'],
      colores: ['azul cielo', 'verde esmeralda', 'marrón tierra', 'blanco nieve'],
      emociones: ['tranquilidad', 'asombro', 'paz', 'aventura', 'serenidad'],
      conceptos: ['naturaleza', 'paisaje', 'ecosistema', 'biodiversidad', 'conservación'],
    };

    await new Promise(resolve => setTimeout(resolve, 100));

    return HttpResponse.json({ phrases });
  }),

  // Fallback handlers for unhandled requests
  http.get('*', () => {
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.post('*', () => {
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),
];

export const server = setupServer(...handlers);