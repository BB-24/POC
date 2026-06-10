import api from "../api/api";

export default function UploadZone() {

  const upload = async e => {

    const file =
      e.target.files[0];

    const form =
      new FormData();

    form.append(
      "file",
      file
    );

    await api.post(
      "/upload",
      form
    );

    alert("Uploaded");
  };

  return (
    <input
      type="file"
      onChange={upload}
    />
  );
}