import { useParams } from "react-router";
import { AddAnimalPage } from "./AddAnimalPage";

export function EditAnimalPage() {
  const { id } = useParams<{ id: string }>();
  return <AddAnimalPage editId={id} />;
}
