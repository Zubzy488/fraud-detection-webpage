"use client"

import { useState, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Upload, AlertCircle, CheckCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Create schema for form validation
const formSchema = z.object({
  ...Array.from({ length: 28 }, (_, i) => ({
    [`v${i + 1}`]: z.string().refine((val) => !isNaN(Number(val)) && val.trim() !== "", {
      message: "Must be a valid number",
    }),
  })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
  amount: z.string().refine((val) => !isNaN(Number(val)) && val.trim() !== "", {
    message: "Must be a valid number",
  }),
  time: z.string().refine((val) => !isNaN(Number(val)) && val.trim() !== "", {
    message: "Must be a valid number",
  }),
})

type FormValues = z.infer<typeof formSchema>

// Define the expected JSON structure
type TransactionData = {
  V1: number
  V2: number
  V3: number
  V4: number
  V5: number
  V6: number
  V7: number
  V8: number
  V9: number
  V10: number
  V11: number
  V12: number
  V13: number
  V14: number
  V15: number
  V16: number
  V17: number
  V18: number
  V19: number
  V20: number
  V21: number
  V22: number
  V23: number
  V24: number
  V25: number
  V26: number
  V27: number
  V28: number
  Amount: number
  Time: number
}

export default function FraudDetection() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ is_fraud: boolean; fraud_probability: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("manual")
  const [dragActive, setDragActive] = useState(false)
  const [lastSubmittedData, setLastSubmittedData] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...Array.from({ length: 28 }, (_, i) => ({
        [`v${i + 1}`]: "",
      })).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
      amount: "",
      time: "",
    },
  })

  // Function to normalize JSON data to the format expected by the API
  const normalizeJsonData = (data: any): TransactionData => {
    const normalized: TransactionData = {
      V1: 0,
      V2: 0,
      V3: 0,
      V4: 0,
      V5: 0,
      V6: 0,
      V7: 0,
      V8: 0,
      V9: 0,
      V10: 0,
      V11: 0,
      V12: 0,
      V13: 0,
      V14: 0,
      V15: 0,
      V16: 0,
      V17: 0,
      V18: 0,
      V19: 0,
      V20: 0,
      V21: 0,
      V22: 0,
      V23: 0,
      V24: 0,
      V25: 0,
      V26: 0,
      V27: 0,
      V28: 0,
      Amount: 0,
      Time: 0,
    }

    // Handle both lowercase v1 and uppercase V1 formats
    for (let i = 1; i <= 28; i++) {
      const lowerKey = `v${i}`
      const upperKey = `V${i}`

      if (data[upperKey] !== undefined) {
        normalized[upperKey as keyof TransactionData] = Number(data[upperKey])
      } else if (data[lowerKey] !== undefined) {
        normalized[upperKey as keyof TransactionData] = Number(data[lowerKey])
      } else {
        throw new Error(`Missing field: v${i} or V${i}`)
      }
    }

    // Handle Amount and Time
    if (data.Amount !== undefined) {
      normalized.Amount = Number(data.Amount)
    } else if (data.amount !== undefined) {
      normalized.Amount = Number(data.amount)
    } else {
      throw new Error("Missing field: amount or Amount")
    }

    if (data.Time !== undefined) {
      normalized.Time = Number(data.Time)
    } else if (data.time !== undefined) {
      normalized.Time = Number(data.time)
    } else {
      throw new Error("Missing field: time or Time")
    }

    return normalized
  }

  // Function to handle API request
  const sendApiRequest = async (data: any) => {
    setLoading(true)
    setError(null)
    setResult(null)

    // Ensure data is in the correct format expected by the API
    let formattedData: TransactionData
    try {
      formattedData = normalizeJsonData(data)
      setLastSubmittedData(formattedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid data format")
      setLoading(false)
      return
    }

    try {
      console.log("Sending data:", JSON.stringify(formattedData))

      // Set a timeout for the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      const response = await fetch("https://fraud-detection-api-z1yo.onrender.com/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId))

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        throw new Error(`API error (${response.status}): ${errorText}`)
      }

      const resultData = await response.json()
      setResult(resultData)
    } catch (err) {
      console.error("Fetch error:", err)

      if (err instanceof DOMException && err.name === "AbortError") {
        setError("⚠️ Request timed out. The server might be slow or unreachable.")
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("⚠️ Network Error — Please try again or check your connection.")
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle manual form submission
  const onSubmit = async (formData: FormValues) => {
    try {
      // Convert form data to the format expected by the API
      const processedData: Record<string, number> = {}

      // Convert v1, v2, etc. to V1, V2, etc.
      for (let i = 1; i <= 28; i++) {
        const lowerKey = `v${i}` as keyof FormValues
        const upperKey = `V${i}`
        processedData[upperKey] = Number(formData[lowerKey])
      }

      // Convert amount and time to Amount and Time
      processedData.Amount = Number(formData.amount)
      processedData.Time = Number(formData.time)

      await sendApiRequest(processedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    }
  }

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      const reader = new FileReader()

      reader.onload = async (event) => {
        try {
          if (!event.target?.result) {
            throw new Error("Failed to read file")
          }

          const jsonData = JSON.parse(event.target.result as string)
          await sendApiRequest(jsonData)
        } catch (err) {
          if (err instanceof SyntaxError) {
            setError("Invalid JSON format. Please check your file.")
          } else {
            setError(err instanceof Error ? err.message : "An unexpected error occurred")
          }
          setLoading(false)
        }
      }

      reader.onerror = () => {
        setError("Error reading file")
        setLoading(false)
      }

      reader.readAsText(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      setLoading(false)
    }
  }

  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  // Handle drop event
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        handleFileUpload(file)
      } else {
        setError("Please upload a JSON file")
      }
    }
  }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        handleFileUpload(file)
      } else {
        setError("Please upload a JSON file")
      }
    }
  }

  // Handle retry
  const handleRetry = () => {
    if (lastSubmittedData) {
      sendApiRequest(lastSubmittedData)
    }
  }

  // Reset everything
  const resetAll = () => {
    form.reset()
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Fill form with sample data
  const fillSampleData = () => {
    const sampleData = {
      v1: "-1.3598",
      v2: "-0.07278",
      v3: "2.5363",
      v4: "1.3781",
      v5: "-0.3383",
      v6: "0.4624",
      v7: "0.2396",
      v8: "0.0986",
      v9: "0.3634",
      v10: "0.0908",
      v11: "-0.5514",
      v12: "-0.6178",
      v13: "-0.9913",
      v14: "-0.3111",
      v15: "1.4681",
      v16: "-0.4704",
      v17: "0.2079",
      v18: "0.0257",
      v19: "0.4034",
      v20: "0.2514",
      v21: "-0.0182",
      v22: "-0.0351",
      v23: "-0.1435",
      v24: "0.1001",
      v25: "-0.0458",
      v26: "0.0616",
      v27: "-0.0823",
      v28: "0.0085",
      amount: "100.00",
      time: "45000",
    }

    form.reset(sampleData)
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Fraud Detection System</CardTitle>
          <CardDescription>
            Enter transaction details or upload a JSON file to check for potential fraud
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="upload">Upload JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 28 }, (_, i) => (
                      <FormField
                        key={`v${i + 1}`}
                        control={form.control}
                        name={`v${i + 1}` as keyof FormValues}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>V{i + 1}</FormLabel>
                            <FormControl>
                              <Input placeholder={`Enter V${i + 1}`} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter amount" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time (seconds)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-between gap-4">
                    <Button type="button" variant="outline" onClick={fillSampleData} className="w-full max-w-[200px]">
                      Fill Sample Data
                    </Button>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking for Fraud...
                        </>
                      ) : (
                        "Check for Fraud"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="upload">
              <div
                className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
                  dragActive ? "border-primary bg-primary/5" : "border-gray-300"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center space-y-4 cursor-pointer">
                  <Upload className="h-10 w-10 text-gray-400" />
                  <p className="text-lg font-medium">Drop JSON file here or click to upload</p>
                  <p className="text-sm text-gray-500">File should contain V1-V28, Amount, and Time fields</p>
                </div>
              </div>

              {loading && (
                <div className="flex justify-center mt-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </TabsContent>
          </Tabs>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mt-8"
                onClick={resetAll}
              >
                <Alert
                  className={`cursor-pointer ${
                    result.is_fraud ? "border-red-500 bg-red-50" : "border-green-500 bg-green-50"
                  }`}
                >
                  <div className="flex items-center">
                    {result.is_fraud ? (
                      <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
                    ) : (
                      <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                    )}
                    <div>
                      <AlertTitle className="text-xl font-bold">
                        {result.is_fraud ? (
                          <span className="text-red-500">⚠️ Fraudulent Transaction Detected</span>
                        ) : (
                          <span className="text-green-500">✅ Transaction is Safe</span>
                        )}
                      </AlertTitle>
                      <AlertDescription className="text-lg">
                        Risk Score: {(result.fraud_probability * 100).toFixed(2)}%
                      </AlertDescription>
                      <p className="text-sm text-muted-foreground mt-2">Click anywhere on this alert to reset</p>
                    </div>
                  </div>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <Alert className="mt-6 border-amber-500 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="flex flex-col">
                <p>{error}</p>
                {lastSubmittedData && (
                  <Button variant="outline" size="sm" onClick={handleRetry} className="mt-2 self-start">
                    Retry Request
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
