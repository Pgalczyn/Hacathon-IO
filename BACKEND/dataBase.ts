import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// Wczytywanie zmiennych środowiskowych (np. z pliku .env)
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/HacathonDB';

export async function connectDatabase() {
    // 1. Obsługa zdarzeń w trakcie działania aplikacji
    mongoose.connection.on('error', (err) => {
        console.error(`Błąd MongoDB w trakcie działania: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('Utracono połączenie z MongoDB. Próba ponownego połączenia...');
    });

    try {
        // 2. Opcje połączenia (w nowym Mongoose są domyślne, ale warto o nich wiedzieć)
        await mongoose.connect(MONGO_URI);

        console.log('✅ Połączono pomyślnie z MongoDB');
    } catch (error) {
        console.error('❌ Błąd krytyczny podczas inicjalizacji bazy danych:');
        // @ts-ignore
        console.error(error.message);

        // Wyjście z procesu, jeśli baza jest niezbędna do działania aplikacji
        process.exit(1);
    }
}