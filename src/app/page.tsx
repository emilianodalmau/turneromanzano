import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'manzano-water-1');

  return (
    <div className="flex flex-col items-center">
      <section className="w-full bg-secondary/50 py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6 grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary font-headline">
              Bienvenido al Museo Manzano Histórico
            </h1>
            <p className="text-lg text-muted-foreground">
              Explore la rica historia de nuestra región. Reserve su visita de forma rápida y sencilla.
            </p>
            <Link href="/book">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Reservar Turno
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          <div className="relative h-64 md:h-96 rounded-lg overflow-hidden shadow-2xl">
            {heroImage && (
               <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint={heroImage.imageHint}
                  priority
                />
            )}
          </div>
        </div>
      </section>

      <section className="w-full py-20 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-primary font-headline">¿Por qué visitarnos?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Descubra un lugar lleno de historia, cultura y paisajes impresionantes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground">
                  <Calendar className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-primary">Planifique su Visita</h3>
                <p className="text-muted-foreground">
                  Evite esperas y asegure su entrada reservando un turno en línea.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground">
                  <MapPin className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-primary">Ubicación Privilegiada</h3>
                <p className="text-muted-foreground">
                  En el corazón de la 'Ciudad del Agua', rodeado de paisajes naturales únicos.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground">
                  <Clock className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-primary">Horarios Flexibles</h3>
                <p className="text-muted-foreground">
                  Ofrecemos una variedad de horarios para adaptarnos a su agenda.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
