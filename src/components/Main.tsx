import { Chat } from "@/components/Chat/Chat";
import { Navbar } from "@/components/Mobile/Navbar";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { ChatBody, ChatFolder, Conversation, KeyValuePair, Message, OpenAIModel, OpenAIModelID, OpenAIModels } from "@/types";
import { cleanConversationHistory, cleanSelectedConversation } from "@/utils/app/clean";
import { DEFAULT_SYSTEM_PROMPT } from "@/utils/app/const";
import { saveConversation, saveConversations, updateConversation } from "@/utils/app/conversation";
import { saveFolders } from "@/utils/app/folders";
import { exportData, importData } from "@/utils/app/importExport";
import { IconArrowBarLeft, IconArrowBarRight } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import modelsHandle from '../api/models'
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";
import { useTranslation } from "@/i18n";

export default function Main() {
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation>();
  const [loading, setLoading] = useState<boolean>(false);
  const [models, setModels] = useState<OpenAIModel[]>([]);
  const [lightMode, setLightMode] = useState<"dark" | "light">("dark");
  const [messageIsStreaming, setMessageIsStreaming] = useState<boolean>(false);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [apiKey, setApiKey] = useState<string>("");
  const [messageError, setMessageError] = useState<boolean>(false);
  const [modelError, setModelError] = useState<boolean>(false);
  const [isUsingEnv, setIsUsingEnv] = useState<boolean>(false);

  const { t } = useTranslation();

  const stopConversationRef = useRef<boolean>(false);

  const handleSend = async (message: Message, isResend: boolean) => {
    if (selectedConversation) {
      let updatedConversation: Conversation;

      if (isResend) {
        const updatedMessages = [...selectedConversation.messages];
        updatedMessages.pop();

        updatedConversation = {
          ...selectedConversation,
          messages: [...updatedMessages, message]
        };
      } else {
        updatedConversation = {
          ...selectedConversation,
          messages: [...selectedConversation.messages, message]
        };
      }

      setSelectedConversation(updatedConversation);
      setLoading(true);
      setMessageIsStreaming(true);
      setMessageError(false);

      const chatBody: ChatBody = {
        model: updatedConversation.model,
        messages: updatedConversation.messages,
        key: apiKey,
        prompt: updatedConversation.prompt
      };

      const controller = new AbortController();
      // const response = await fetch("http://localhost:3500/api/chat", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json"
      //   },
      //   signal: controller.signal,
      //   body: JSON.stringify(chatBody)
      // });
      console.log(chatBody);
      // const response = await chatHandle(chatBody)

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${chatBody.key}`
        },
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          model: chatBody.model.id,
          messages: [
            {
              role: "system",
              content: chatBody.prompt
            },
            ...chatBody.messages
          ],
          max_tokens: 1000,
          temperature: 0.0,
          stream: true
        })
      });

      if (!response.ok) {
        setLoading(false);
        setMessageIsStreaming(false);
        setMessageError(true);
        return;
      }

      const data = response.body;

      if (!data) {
        setLoading(false);
        setMessageIsStreaming(false);
        setMessageError(true);

        return;
      }

      if (updatedConversation.messages.length === 1) {
        const { content } = message;
        const customName = content.length > 30 ? content.substring(0, 30) + "..." : content;

        updatedConversation = {
          ...updatedConversation,
          name: customName
        };
      }

      setLoading(false);

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let isFirst = true;
      let text = "";

      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;

          if (data === "[DONE]") {
            return;
          }

          try {
            const json = JSON.parse(data);
            // console.log(json);
            const chunkValue = json.choices[0].delta.content || '';
            console.log(chunkValue);
            text += chunkValue;

            if (isFirst) {
              isFirst = false;
              const updatedMessages: Message[] = [...updatedConversation.messages, { role: "assistant", content: chunkValue }];
    
              updatedConversation = {
                ...updatedConversation,
                messages: updatedMessages
              };
    
              setSelectedConversation(updatedConversation);
            } else {
              const updatedMessages: Message[] = updatedConversation.messages.map((message, index) => {
                if (index === updatedConversation.messages.length - 1) {
                  return {
                    ...message,
                    content: text
                  };
                }
    
                return message;
              });
    
              updatedConversation = {
                ...updatedConversation,
                messages: updatedMessages
              };
    
              setSelectedConversation(updatedConversation);
            }
            
          } catch (e) {
          }
        }
      };

      const parser = createParser(onParse);

      // for await (const chunk of data as any) {
      //   parser.feed(decoder.decode(chunk));
      // }

      while (!done) {
        if (stopConversationRef.current === true) {
          controller.abort();
          done = true;
          break;
        }
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        parser.feed(chunkValue);
        // console.log(chunkValue);
        // const chunkJson = JSON.parse(chunkValue);

        // console.log(chunkJson);
        // text += chunkJson.choices[0].delta.content;


      }

      saveConversation(updatedConversation);

      const updatedConversations: Conversation[] = conversations.map((conversation) => {
        if (conversation.id === selectedConversation.id) {
          return updatedConversation;
        }

        return conversation;
      });

      if (updatedConversations.length === 0) {
        updatedConversations.push(updatedConversation);
      }

      setConversations(updatedConversations);

      saveConversations(updatedConversations);

      setMessageIsStreaming(false);
    }
  };

  const fetchModels = async (key: string) => {
    // const response = await fetch("https://api.openai.com/v1/models", {
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": `Bearer ${key}`
    //   },
    // });
    const response = await modelsHandle({key})

    if (!response.ok) {
      setModelError(true);
      return;
    }

    const data = await response.json();

    if (!data) {
      setModelError(true);
      return;
    }

    setModels(data);
    setModelError(false);
  };

  const handleLightMode = (mode: "dark" | "light") => {
    setLightMode(mode);
    localStorage.setItem("theme", mode);
  };

  const handleApiKeyChange = (apiKey: string) => {
    setApiKey(apiKey);
    localStorage.setItem("apiKey", apiKey);
  };

  const handleEnvChange = (isUsingEnv: boolean) => {
    setIsUsingEnv(isUsingEnv);
    localStorage.setItem("isUsingEnv", isUsingEnv.toString());
  };

  const handleExportData = () => {
    exportData();
  };

  const handleImportConversations = (data: { conversations: Conversation[]; folders: ChatFolder[] }) => {
    importData(data.conversations, data.folders);
    setConversations(data.conversations);
    setSelectedConversation(data.conversations[data.conversations.length - 1]);
    setFolders(data.folders);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    saveConversation(conversation);
  };

  const handleCreateFolder = (name: string) => {
    const lastFolder = folders[folders.length - 1];

    const newFolder: ChatFolder = {
      id: lastFolder ? lastFolder.id + 1 : 1,
      name
    };

    const updatedFolders = [...folders, newFolder];

    setFolders(updatedFolders);
    saveFolders(updatedFolders);
  };

  const handleDeleteFolder = (folderId: number) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    setFolders(updatedFolders);
    saveFolders(updatedFolders);

    const updatedConversations: Conversation[] = conversations.map((c) => {
      if (c.folderId === folderId) {
        return {
          ...c,
          folderId: 0
        };
      }

      return c;
    });
    setConversations(updatedConversations);
    saveConversations(updatedConversations);
  };

  const handleUpdateFolder = (folderId: number, name: string) => {
    const updatedFolders = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          name
        };
      }

      return f;
    });

    setFolders(updatedFolders);
    saveFolders(updatedFolders);
  };

  const handleNewConversation = () => {
    const lastConversation = conversations[conversations.length - 1];

    const newConversation: Conversation = {
      id: lastConversation ? lastConversation.id + 1 : 1,
      name: `${t('Conversation')} ${lastConversation ? lastConversation.id + 1 : 1}`,
      messages: [],
      model: OpenAIModels[OpenAIModelID.GPT_3_5],
      prompt: t(DEFAULT_SYSTEM_PROMPT),
      folderId: 0
    };

    const updatedConversations = [...conversations, newConversation];

    setSelectedConversation(newConversation);
    setConversations(updatedConversations);

    saveConversation(newConversation);
    saveConversations(updatedConversations);

    setLoading(false);
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    const updatedConversations = conversations.filter((c) => c.id !== conversation.id);
    setConversations(updatedConversations);
    saveConversations(updatedConversations);

    if (updatedConversations.length > 0) {
      setSelectedConversation(updatedConversations[updatedConversations.length - 1]);
      saveConversation(updatedConversations[updatedConversations.length - 1]);
    } else {
      setSelectedConversation({
        id: 1,
        name: "New conversation",
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_3_5],
        prompt: t(DEFAULT_SYSTEM_PROMPT),
        folderId: 0
      });
      localStorage.removeItem("selectedConversation");
    }
  };

  const handleUpdateConversation = (conversation: Conversation, data: KeyValuePair) => {
    const updatedConversation = {
      ...conversation,
      [data.key]: data.value
    };

    const { single, all } = updateConversation(updatedConversation, conversations);

    setSelectedConversation(single);
    setConversations(all);
  };

  const handleClearConversations = () => {
    setConversations([]);
    localStorage.removeItem("conversationHistory");

    setSelectedConversation({
      id: 1,
      name: "New conversation",
      messages: [],
      model: OpenAIModels[OpenAIModelID.GPT_3_5],
      prompt: t(DEFAULT_SYSTEM_PROMPT),
      folderId: 0
    });
    localStorage.removeItem("selectedConversation");

    setFolders([]);
    localStorage.removeItem("folders");

    setIsUsingEnv(false);
    localStorage.removeItem("isUsingEnv");
  };

  useEffect(() => {
    if (window.innerWidth < 640) {
      setShowSidebar(false);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (apiKey) {
      fetchModels(apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme) {
      setLightMode(theme as "dark" | "light");
    }

    const apiKey = localStorage.getItem("apiKey");
    if (apiKey) {
      setApiKey(apiKey);
      fetchModels(apiKey);
    }

    const usingEnv = localStorage.getItem("isUsingEnv");
    if (usingEnv) {
      setIsUsingEnv(usingEnv === "true");
      fetchModels("");
    }

    if (window.innerWidth < 640) {
      setShowSidebar(false);
    }

    const folders = localStorage.getItem("folders");
    if (folders) {
      setFolders(JSON.parse(folders));
    }

    const conversationHistory = localStorage.getItem("conversationHistory");
    if (conversationHistory) {
      const parsedConversationHistory: Conversation[] = JSON.parse(conversationHistory);
      const cleanedConversationHistory = cleanConversationHistory(parsedConversationHistory);
      setConversations(cleanedConversationHistory);
    }

    const selectedConversation = localStorage.getItem("selectedConversation");
    if (selectedConversation) {
      const parsedSelectedConversation: Conversation = JSON.parse(selectedConversation);
      const cleanedSelectedConversation = cleanSelectedConversation(parsedSelectedConversation);
      setSelectedConversation(cleanedSelectedConversation);
    } else {
      setSelectedConversation({
        id: 1,
        name: "New conversation",
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_3_5],
        prompt: t(DEFAULT_SYSTEM_PROMPT),
        folderId: 0
      });
    }
  }, []);

  return (
    <>
      {selectedConversation && (
        <main className={`flex flex-col h-screen w-screen text-white dark:text-white text-sm ${lightMode}`}>
          <div className="sm:hidden w-full fixed top-0 ps-10">
            <Navbar
              selectedConversation={selectedConversation}
              onNewConversation={handleNewConversation}
            />
          </div>
          <div className="draggable pt-10 absolute top-0 w-full"></div>
          <article className="flex h-full w-full pt-[48px] sm:pt-0">
            {showSidebar ? (
              <>
                <Sidebar
                  loading={messageIsStreaming}
                  conversations={conversations}
                  lightMode={lightMode}
                  selectedConversation={selectedConversation}
                  apiKey={apiKey}
                  folders={folders}
                  onToggleLightMode={handleLightMode}
                  onCreateFolder={handleCreateFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onUpdateFolder={handleUpdateFolder}
                  onNewConversation={handleNewConversation}
                  onSelectConversation={handleSelectConversation}
                  onDeleteConversation={handleDeleteConversation}
                  onToggleSidebar={() => setShowSidebar(!showSidebar)}
                  onUpdateConversation={handleUpdateConversation}
                  onApiKeyChange={handleApiKeyChange}
                  onClearConversations={handleClearConversations}
                  onExportConversations={handleExportData}
                  onImportConversations={handleImportConversations}
                />

                <IconArrowBarLeft
                  className="fixed top-2.5 left-4 sm:top-1 sm:left-4 sm:text-neutral-700 dark:text-white cursor-pointer hover:text-gray-400 dark:hover:text-gray-300 h-7 w-7 sm:h-8 sm:w-8 sm:hidden"
                  onClick={() => setShowSidebar(!showSidebar)}
                />
              </>
            ) : (
              <IconArrowBarRight
                className="fixed text-white z-50 top-2.5 left-4 sm:top-1.5 sm:left-4 sm:text-neutral-700 dark:text-white cursor-pointer hover:text-gray-400 dark:hover:text-gray-300 h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => setShowSidebar(!showSidebar)}
              />
            )}

            <Chat
              conversation={selectedConversation}
              messageIsStreaming={messageIsStreaming}
              apiKey={apiKey}
              isUsingEnv={isUsingEnv}
              modelError={modelError}
              messageError={messageError}
              models={models}
              loading={loading}
              lightMode={lightMode}
              onSend={handleSend}
              onUpdateConversation={handleUpdateConversation}
              onAcceptEnv={handleEnvChange}
              stopConversationRef={stopConversationRef}
            />
          </article>
        </main>
      )}
    </>
  );
}
