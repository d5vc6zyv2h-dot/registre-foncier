import { NextResponse } from "next/server";
import { PinataSDK } from "pinata";


export async function POST(request: Request) {
  try {
    const jwt = process.env.PINATA_JWT;
    const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL;

    if (!jwt || !gateway) {
      return NextResponse.json(
        { error: "Configuration Pinata manquante." },
        { status: 500 }
      );
    }

    const pinata = new PinataSDK({
      pinataJwt: jwt,
      pinataGateway: gateway,
    });

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Aucun fichier valide fourni." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Le fichier dépasse la limite de 10 Mo." },
        { status: 400 }
      );
    }

    const result = await pinata.upload.public.file(file);

    return NextResponse.json({
      success: true,
      cid: result.cid,
      name: result.name,
      size: result.size,
    });
  } catch (error) {
    console.error("Erreur Pinata :", error);

    return NextResponse.json(
      { error: "Échec du téléversement vers IPFS." },
      { status: 500 }
    );
  }
}