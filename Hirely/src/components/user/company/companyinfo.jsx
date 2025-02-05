import React, { useState, useEffect } from "react";

const CompanyInfo = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const companyName = "Google";

  useEffect(() => {
    if (!companyName) return;

    const fetchCompanyData = async () => {
      setLoading(true);
      try {
        console.log(`Fetching data for: ${companyName}`);

        const response = await fetch(
          "https://api-inference.huggingface.co/models/openai-community/gpt2-large",
          {
            headers: {
              Authorization: "Bearer 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",
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
            inputs: `Describe the company '${companyName}' briefly, including its industry, headquarters location, and key facts.`,
            parameters: { max_new_tokens: 50, temperature: 0.7 },
          }),
        });

        const data = await response.json();
        console.log("API Response:", data);

        if (Array.isArray(data) && data.length > 0) {
          // Extract the generated text, removing the prompt
          const generatedText = data[0].generated_text;
          const cleanText = generatedText.replace(/^.*?'Google'/, "").trim(); // Remove repeated prompt part
          setData(cleanText || "No valid response received.");
        } else {
          setData("No valid response received.");
        }
      } catch (err) {
        console.error("API Error:", err);
        setError("Failed to fetch company data.");
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [companyName]);

  return (
    <div className="p-4 border rounded-lg shadow-md bg-black">
      <h2 className="text-lg font-semibold text-white">{companyName}</h2>
      {loading && <p className="text-white">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {data ? <p className="mt-2 text-white">{data}</p> : <p className="text-white">No data received.</p>}
    </div>
  );
};

export default CompanyInfo;
