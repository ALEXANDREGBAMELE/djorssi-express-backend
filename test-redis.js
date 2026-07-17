const redis = require('./config/redis');

async function test() {
  try {
    await redis.set('test', 'Hello Redis');
    const value = await redis.get('test');
    console.log('✅ Redis fonctionne! Valeur:', value);
    
    const keys = await redis.keys('*');
    console.log('📦 Clés en cache:', keys);
  } catch (error) {
    console.error('❌ Erreur Redis:', error.message);
  }
}

test();