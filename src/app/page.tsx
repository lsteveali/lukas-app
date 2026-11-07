import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-3xl">Lukas</CardTitle>
          <CardDescription>
            Tus finanzas personales y gastos compartidos, en un solo lugar.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button disabled>Próximamente</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
